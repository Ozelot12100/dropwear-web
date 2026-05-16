import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/layout/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks';

export default function App() {
    const { session, profile, isLoading } = useAuth();

    return (
        <Routes>
            {/* 
        Ruta pública de Login.
        Si el usuario ya está autenticado, lo redirigiremos al dashboard y no al form de login vacio.
      */}
            <Route
                path="/login"
                element={
                    !isLoading && session ? <Navigate to="/" replace /> : <Login />
                }
            />

            {/* Rutas Privadas: Se chequean a través de PrivateRoute */}
            <Route element={<PrivateRoute />}>
                {/* Aquí podemos inyectar un Layout general con Navbar y Sidebar */}
                <Route path="/" element={<Dashboard />} />
            </Route>

            {/* Fallback Catch-all: Redirige cualquier ruta inexistente a la raíz */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}