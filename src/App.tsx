import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/layout/PrivateRoute';
import { RoleGuard } from './components/layout/RoleGuard';
import { useAuth } from './hooks';

// Code-splitting por ruta: cada página se descarga solo cuando se navega a ella,
// reduciendo drásticamente el bundle inicial (clave para móvil / red lenta).
const Login = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const CatalogsPage = lazy(() => import('./pages/CatalogsPage'));
const LogsPage = lazy(() => import('./pages/LogsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function RouteFallback() {
    return (
        <div className="flex items-center justify-center min-h-[50vh] text-sm text-gray-400">
            Cargando…
        </div>
    );
}

export default function App() {
    const { session, isLoading } = useAuth();

    return (
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
    );
}
