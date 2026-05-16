import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Package } from 'lucide-react';
import { Navbar } from './Navbar';

export default function PrivateRoute() {
    const { session, profile, isLoading } = useAuth();

    // Pantalla de carga mientras Supabase verifica el token en la persistencia local
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
                <Package className="animate-bounce mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-700">Verificando sesión...</h2>
            </div>
        );
    }

    // Protección: Si no hay token de autenticación
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Opcional (Si el perfil aún no ha sido cargado pero la sesión sí):
    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
                <Package className="animate-spin mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-700">Cargando perfil (RBAC)...</h2>
            </div>
        );
    }

    // Si todo es exitoso, renderiza las páginas hijas protegidas dentro del contenedor maestro
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
}