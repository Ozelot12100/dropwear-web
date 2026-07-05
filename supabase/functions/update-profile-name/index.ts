import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Falta el token de autorización.' }, 401)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      }
    )

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) return json({ error: 'Token inválido o expirado.' }, 401)

    const { new_name } = await req.json()
    if (!new_name || String(new_name).trim().length < 3) {
      return json({ error: 'El nombre debe tener al menos 3 caracteres.' }, 400)
    }

    // Actualiza el propio nombre con privilegios de admin (evita bloqueos de RLS).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ full_name: String(new_name).trim() })
      .eq('id', user.id)

    if (profileError) {
      return json({ error: `Error al actualizar el nombre: ${profileError.message}` }, 500)
    }

    return json({ message: 'Nombre actualizado exitosamente.' }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error desconocido.' }, 500)
  }
})
