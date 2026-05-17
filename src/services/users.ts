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
    async createUser(payload: CreateUserPayload): Promise<{ user: any, message: string }> {
        // La librería supabase.functions.invoke inyecta en automático el JWT (sesión) del superadmin actual.
        // Pega de manera silenciosa hacia https://ticjeryrdulymcvyhmlh.supabase.co/functions/v1/create-user
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

    // 5. Actualizar el nombre completo del propio usuario (no requiere Edge Function por RLS)
    async updateProfileName(userId: string, newName: string): Promise<void> {
        const { error } = await (supabase as any)
            .from('user_profiles')
            .update({ full_name: newName })
            .eq('id', userId);

        if (error) {
            console.error('Error al actualizar nombre:', error);
            throw error;
        }
    }
};
