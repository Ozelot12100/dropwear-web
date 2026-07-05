import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';

interface CreateUserPayload {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
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

    // 2. Ejecutar la Edge Function para crear un usuario de forma segura
    async createUser(payload: CreateUserPayload): Promise<{ user: unknown, message: string }> {
        // La librería supabase.functions.invoke inyecta en automático el JWT (sesión) del superadmin actual
        // y llama a la Edge Function `create-user` del proyecto configurado en VITE_SUPABASE_URL.
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: payload
        });

        // Supabase-js detecta si hubo un rechazo de red o de ejecución en la Edge Function
        if (error) {
            console.error('Error invocando Edge Function create-user:', error);
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }

        // Si la función nos responde exitosamente un JSON pero con una propiedad { error: 'Mensaje' }
        if (data?.error) {
            console.error('La Edge Function retornó un error controlado:', data.error);
            throw new Error(data.error);
        }

        return data;
    },

    // 3. Ejecutar la Edge Function para restablecer contraseña de cualquier usuario
    async resetPassword(targetUserId: string, newPassword: string): Promise<{ message: string }> {
        const { data, error } = await supabase.functions.invoke('reset-password', {
            body: { target_user_id: targetUserId, new_password: newPassword }
        });

        if (error) {
            console.error('Error invocando Edge Function reset-password:', error);
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }

        if (data?.error) {
            console.error('La Edge Function retornó un error controlado:', data.error);
            throw new Error(data.error);
        }

        return data;
    },

    // 4. Ejecutar la Edge Function para bloquear/desbloquear un usuario
    async toggleUserStatus(targetUserId: string, action: 'ban' | 'unban'): Promise<{ message: string }> {
        const { data, error } = await supabase.functions.invoke('toggle-user-status', {
            body: { target_user_id: targetUserId, action }
        });

        if (error) {
            console.error('Error invocando Edge Function toggle-user-status:', error);
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }

        if (data?.error) {
            console.error('La Edge Function retornó un error controlado:', data.error);
            throw new Error(data.error);
        }

        return data;
    },

    // 5. Actualizar el rol de un usuario (requiere Edge Function por verificación de seguridad superadmin)
    async updateUserRole(targetUserId: string, newRole: string): Promise<{ message: string }> {
        const { data, error } = await supabase.functions.invoke('update-user-role', {
            body: { target_user_id: targetUserId, new_role: newRole }
        });

        if (error) {
            console.error('Error invocando Edge Function update-user-role:', error);
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }

        if (data?.error) {
            console.error('La Edge Function retornó un error controlado:', data.error);
            throw new Error(data.error);
        }

        return data;
    },

    // 6. Actualizar el nombre completo del propio usuario usando Edge Function para evitar problemas de RLS
    async updateProfileName(newName: string): Promise<void> {
        const { data, error } = await supabase.functions.invoke('update-profile-name', {
            body: { new_name: newName }
        });

        if (error) {
            console.error('Error invocando Edge Function update-profile-name:', error);
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }

        if (data?.error) {
            console.error('La Edge Function retornó un error controlado:', data.error);
            throw new Error(data.error);
        }
    }
};
