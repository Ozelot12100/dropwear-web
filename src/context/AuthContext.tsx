import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Obtención inicial de la sesión al montar la app
        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchUserProfile(session.user.id);
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();

        // 2. Suscripción a cambios de estado de autenticación (Login/Logout dinámico)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                await fetchUserProfile(newSession.user.id);
            } else {
                setProfile(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Función interna para obtener el rol y datos suplementarios atados a la cuenta
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

            setProfile(data);
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
            setProfile(null);
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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un <AuthProvider>');
    }
    return context;
}
