import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Función interna para obtener el rol y datos suplementarios atados a la cuenta.
    // Se declara antes del efecto que la usa.
    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                setProfile(null);
                return;
            }

            // H8: si un administrador bloqueó la cuenta (is_active=false), cerrar
            // sesión de inmediato en vez de dejar la sesión activa.
            if (data?.is_active === false) {
                setProfile(null);
                await supabase.auth.signOut();
                return;
            }

            setProfile(data);
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
            setProfile(null);
        }
    };

    useEffect(() => {
        let active = true;

        // Red de seguridad: pase lo que pase, nunca dejar la app colgada en
        // "Verificando sesión...". Si a los 5s la sesión no se resolvió, dejamos
        // de bloquear (onAuthStateChange corregirá el estado si llega tarde).
        const safetyTimer = setTimeout(() => { if (active) setIsLoading(false); }, 5000);
        const finishLoading = () => { clearTimeout(safetyTimer); if (active) setIsLoading(false); };

        // 1. Obtención inicial de la sesión al montar la app. La CARGA se resuelve
        //    en cuanto conocemos la sesión; el perfil (RBAC) se trae aparte para
        //    que un fallo/lentitud de esa consulta no congele la pantalla.
        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!active) return;
                setSession(session);
                setUser(session?.user ?? null);
                finishLoading();
                if (session?.user) await fetchUserProfile(session.user.id);
            } catch (error) {
                console.error('Error fetching session:', error);
                finishLoading();
            }
        };
        init();

        // 2. Suscripción a cambios de estado de autenticación (Login/Logout dinámico)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (!active) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);
            finishLoading();
            if (newSession?.user) {
                await fetchUserProfile(newSession.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => {
            active = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    // H8: al recuperar el foco / volver a la pestaña, revalida el perfil para
    // reflejar cambios de rol o bloqueo hechos por un admin sin recargar la página.
    useEffect(() => {
        if (!user?.id) return;
        const revalidate = () => {
            if (document.visibilityState === 'hidden') return;
            fetchUserProfile(user.id);
        };
        window.addEventListener('focus', revalidate);
        document.addEventListener('visibilitychange', revalidate);
        return () => {
            window.removeEventListener('focus', revalidate);
            document.removeEventListener('visibilitychange', revalidate);
        };
    }, [user?.id]);

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchUserProfile(user.id);
        }
    };

    const signOut = async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        // La suscripción de onAuthStateChange se encargará de limpiar el estado
    };

    const value = {
        session,
        user,
        profile,
        isLoading,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un <AuthProvider>');
    }
    return context;
}
