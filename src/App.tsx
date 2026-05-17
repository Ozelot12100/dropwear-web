import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/layout/PrivateRoute';
import { RoleGuard } from './components/layout/RoleGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CatalogsPage from './pages/CatalogsPage';
import LogsPage from './pages/LogsPage';
import { useAuth } from './hooks';

export default function App() {
    const { session, isLoading } = useAuth();

    return (
        <Routes>
            {/* Ruta pública: redirige al dashboard si ya está autenticado */}
            <Route
                path="/login"
                element={!isLoading && session ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Rutas Privadas: autenticación requerida */}
            <Route element={<PrivateRoute />}>
                {/* Dashboard: accesible para todos los roles */}
                <Route path="/" element={<Dashboard />} />

                {/* Catálogos: solo socio y superadmin */}
                <Route
                    path="/catalogs"
                    element={
                        <RoleGuard allowed={['socio', 'superadmin']} mode="redirect">
                            <CatalogsPage />
                        </RoleGuard>
                    }
                />

                {/* Bitácora: todos los roles autenticados */}
                <Route path="/logs" element={<LogsPage />} />
            </Route>

            {/* Fallback: redirige cualquier ruta inexistente a la raíz */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}