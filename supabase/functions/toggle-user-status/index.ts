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

    if (!profile || profile.role !== 'superadmin') {
      return json({ error: 'Permisos insuficientes. Solo un superadmin puede bloquear cuentas.' }, 403)
    }

    const { target_user_id, action } = await req.json()
    if (!target_user_id || (action !== 'ban' && action !== 'unban')) {
      return json({ error: 'Datos inválidos. Verifica el ID de usuario y la acción.' }, 400)
    }
    if (target_user_id === user.id) {
      return json({ error: 'No puedes bloquear tu propia cuenta.' }, 403)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Aplicar/quitar baneo en la capa de Autenticación (100 años).
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { ban_duration: action === 'ban' ? '876000h' : 'none' }
    )
    if (authError) return json({ error: authError.message }, 400)

    // 2. Reflejar el estado en user_profiles.is_active.
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_active: action === 'unban' })
      .eq('id', target_user_id)

    if (profileError) {
      // No es fatal: el baneo en Auth ya se aplicó. Se registra para diagnóstico.
      console.error('No se pudo actualizar is_active en user_profiles', profileError)
    }

    return json({ message: `Usuario ${action === 'ban' ? 'bloqueado' : 'desbloqueado'} exitosamente.` }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error desconocido.' }, 500)
  }
})
