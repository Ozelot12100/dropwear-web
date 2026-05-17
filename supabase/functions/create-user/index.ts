import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Manejo de peticiones preflight (CORS) desde el navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Obtener el Token JWT del solicitante (Frontend)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta el token de autorización')

    // 2. Cliente normal para verificar la identidad del solicitante
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error(`Token inválido o expirado: ${userError?.message || 'Desconocido'}`)

    // Verificar si el usuario que llama a la función es realmente un 'superadmin'
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes. Solo los administradores pueden crear usuarios.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Cliente Admin (ignora reglas de seguridad RLS) para realizar la escritura
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Leer los datos recibidos
    const { email, password, full_name, role } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Faltan campos obligatorios (email, password, full_name, role)')
    }

    // 5. Crear el usuario en el sistema de autenticación nativo (auth.users)
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Para que puedan iniciar sesión sin validar por email
    })

    if (createError) throw createError
    const newUserId = newAuthUser.user.id

    // 6. Inmediatamente crear su perfil público en nuestra base de datos (user_profiles)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([
        {
          id: newUserId,
          full_name,
          role,
        },
      ])

    // Rollback: Si falla el perfil, borrar el usuario de auth.users para no dejar basura
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw profileError
    }

    // 7. Éxito absoluto
    return new Response(JSON.stringify({ message: 'Usuario y perfil creados exitosamente', user: newAuthUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Error desconocido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
