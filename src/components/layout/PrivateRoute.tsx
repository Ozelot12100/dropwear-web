import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Package } from 'lucide-react';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

export default function PrivateRoute() {
    const { session, profile, isLoading } = useAuth();

    // Pantalla de carga mientras Supabase verifica el token en la persistencia local
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-ink">
                <Package className="animate-bounce mb-4" size={48} />
                <h2 className="font-heading text-xl font-semibold text-ink">Verificando sesión...</h2>
            </div>
        );
    }

    // Protección: Si no hay token de autenticación
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Si el perfil aún no ha sido cargado pero la sesión sí:
    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-ink">
                <Package className="animate-spin mb-4" size={48} />
                <h2 className="font-heading text-xl font-semibold text-ink">Cargando perfil (RBAC)...</h2>
            </div>
        );
    }

    // Layout principal: Navbar arriba + contenido + BottomNav en móvil
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            {/*
              pb-20: padding inferior extra en móvil para que el BottomNav (h≈64px)
              no tape el contenido de las páginas.
              sm:pb-0: en desktop no se necesita.
            */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 pb-24 sm:pb-6 lg:px-8 lg:py-8">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}