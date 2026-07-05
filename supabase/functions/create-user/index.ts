import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES = ['superadmin', 'socio', 'vendedor', 'repartidor', 'contador']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

Deno.serve(async (req) => {
  // Manejo de peticiones preflight (CORS) desde el navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar la identidad del solicitante
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

    // 2. Solo un superadmin puede crear usuarios
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return json({ error: 'Permisos insuficientes. Solo los administradores pueden crear usuarios.' }, 403)
    }

    // 3. Validar los datos recibidos
    const { email, password, full_name, role } = await req.json()
    if (!email || !password || !full_name || !role) {
      return json({ error: 'Faltan campos obligatorios (email, password, nombre, rol).' }, 400)
    }
    if (!EMAIL_RE.test(String(email))) {
      return json({ error: 'El correo electrónico no tiene un formato válido.' }, 400)
    }
    if (String(password).length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
    }
    if (String(full_name).trim().length < 3) {
      return json({ error: 'El nombre debe tener al menos 3 caracteres.' }, 400)
    }
    if (!ROLES.includes(role)) {
      return json({ error: 'Rol inválido.' }, 400)
    }

    // 4. Crear el usuario con privilegios de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) return json({ error: createError.message }, 400)

    const newUserId = newAuthUser.user.id

    // 5. Crear su perfil; si falla, rollback del usuario de auth
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{ id: newUserId, full_name: String(full_name).trim(), role }])

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return json({ error: `No se pudo crear el perfil: ${profileError.message}` }, 500)
    }

    return json({ message: 'Usuario y perfil creados exitosamente.', user: newAuthUser.user }, 200)

  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error desconocido.' }, 500)
  }
})
