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

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const { target_user_id, new_password } = await req.json()
    if (!target_user_id || !new_password || String(new_password).length < 6) {
      return json({ error: 'Datos inválidos. La contraseña debe tener mínimo 6 caracteres.' }, 400)
    }

    // Un superadmin puede cambiar la de cualquiera; los demás, solo la propia.
    if (!profile || (profile.role !== 'superadmin' && user.id !== target_user_id)) {
      return json({ error: 'Permisos insuficientes. No puedes cambiar la contraseña de otra persona.' }, 403)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    )
    if (resetError) return json({ error: resetError.message }, 400)

    return json({ message: 'Contraseña actualizada exitosamente.' }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error desconocido.' }, 500)
  }
})
