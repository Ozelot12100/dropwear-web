import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/layout/PrivateRoute';
import { RoleGuard } from './components/layout/RoleGuard';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import CatalogsPage from './pages/CatalogsPage';
import LogsPage from './pages/LogsPage';
import StaffPage from './pages/StaffPage';
import ProfilePage from './pages/ProfilePage';
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
                {/* Dashboard Ejecutivo: accesible para todos los roles en la raíz */}
                <Route path="/" element={<DashboardPage />} />

                {/* Inventario: accesible para todos los roles */}
                <Route path="/inventory" element={<InventoryPage />} />

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

                {/* Staff: solo superadmin */}
                <Route
                    path="/staff"
                    element={
                        <RoleGuard allowed={['superadmin']} mode="redirect">
                            <StaffPage />
                        </RoleGuard>
                    }
                />

                {/* Perfil de Usuario */}
                <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback: redirige cualquier ruta inexistente a la raíz */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}