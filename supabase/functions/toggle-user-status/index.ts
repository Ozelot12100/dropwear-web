import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta el token de autorización')

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
    if (userError || !user) throw new Error(`Token inválido o expirado: ${userError?.message || 'Desconocido'}`)

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Permisos insuficientes. Solo un superadmin puede bloquear cuentas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const body = await req.json()
    const { target_user_id, action } = body

    if (!target_user_id || (action !== 'ban' && action !== 'unban')) {
      return new Response(
        JSON.stringify({ error: 'Datos inválidos. Verifica el ID de usuario y la acción.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Aplicar baneo en la capa de Autenticación
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { ban_duration: action === 'ban' ? '876000h' : 'none' } // 100 años o quitar ban
    )

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 2. Reflejar el estado en user_profiles (requiere que exista la columna is_active)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_active: action === 'unban' })
      .eq('id', target_user_id)

    if (profileError) {
      // Ignorar si la columna no existe aún, pero reportarlo en console para logs
      console.error("No se pudo actualizar is_active en user_profiles", profileError);
    }

    return new Response(
      JSON.stringify({ message: `Usuario ${action === 'ban' ? 'bloqueado' : 'desbloqueado'} exitosamente.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
