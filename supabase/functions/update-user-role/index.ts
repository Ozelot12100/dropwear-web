import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES = ['superadmin', 'socio', 'vendedor', 'repartidor', 'contador']

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

    if (!profile || profile.role !== 'superadmin') {
      return json({ error: 'Permisos insuficientes. Solo un superadmin puede cambiar roles.' }, 403)
    }

    const { target_user_id, new_role } = await req.json()
    if (!target_user_id || !new_role) {
      return json({ error: 'Datos inválidos. Verifica el ID de usuario y el nuevo rol.' }, 400)
    }
    if (!ROLES.includes(new_role)) {
      return json({ error: 'Rol inválido.' }, 400)
    }
    if (target_user_id === user.id) {
      return json({ error: 'Medida de seguridad: no puedes modificar tu propio rol. Pide a otro superadmin que lo haga.' }, 403)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ role: new_role })
      .eq('id', target_user_id)

    if (profileError) {
      return json({ error: `Error al actualizar el rol: ${profileError.message}` }, 500)
    }

    return json({ message: `Rol actualizado exitosamente a ${new_role}.` }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error desconocido.' }, 500)
  }
})
