import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';

interface CreateUserPayload {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
}

/**
 * Invoca una Edge Function y devuelve su cuerpo, lanzando un Error con el
 * MENSAJE REAL en caso de fallo. Es robusto ante dos estilos de error:
 *   - Función que responde con código HTTP de error (403/400/500): supabase-js
 *     pone `error` (FunctionsHttpError) y el mensaje real vive en el cuerpo,
 *     accesible vía `error.context.json()`.
 *   - Función que responde 200 con `{ error }` (patrón legado).
 */
async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke(name, { body });

    if (error) {
        let message = error.message || 'Error de conexión con el servidor.';
        const context = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
        if (context && typeof context.json === 'function') {
            try {
                const parsed = await context.json();
                if (parsed?.error) message = parsed.error;
            } catch {
                // El cuerpo no era JSON; conservamos el mensaje genérico.
            }
        }
        console.error(`Edge Function ${name} falló:`, message);
        throw new Error(message);
    }

    // Compatibilidad con funciones que aún responden 200 con { error }.
    if (data?.error) {
        console.error(`Edge Function ${name} retornó un error controlado:`, data.error);
        throw new Error(data.error);
    }

    return data as T;
}

export const usersService = {
    // 1. Obtener todos los perfiles de la base de datos (para mostrar la tabla)
    async getUsers(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener usuarios:', error);
            throw error;
        }
        return data || [];
    },

    // 2. Crear un usuario de forma segura (Edge Function con privilegios de admin)
    createUser(payload: CreateUserPayload): Promise<{ user: unknown; message: string }> {
        return invokeFunction('create-user', { ...payload });
    },

    // 3. Restablecer la contraseña de un usuario (superadmin) o la propia
    resetPassword(targetUserId: string, newPassword: string): Promise<{ message: string }> {
        return invokeFunction('reset-password', { target_user_id: targetUserId, new_password: newPassword });
    },

    // 4. Bloquear/desbloquear un usuario (soft-delete vía ban)
    toggleUserStatus(targetUserId: string, action: 'ban' | 'unban'): Promise<{ message: string }> {
        return invokeFunction('toggle-user-status', { target_user_id: targetUserId, action });
    },

    // 5. Actualizar el rol de un usuario (solo superadmin)
    updateUserRole(targetUserId: string, newRole: string): Promise<{ message: string }> {
        return invokeFunction('update-user-role', { target_user_id: targetUserId, new_role: newRole });
    },

    // 6. Actualizar el nombre completo del propio usuario (evita bloqueos de RLS)
    async updateProfileName(newName: string): Promise<void> {
        await invokeFunction('update-profile-name', { new_name: newName });
    },
};
