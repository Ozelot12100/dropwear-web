import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import type { UserRole } from '../../types';

interface RoleGuardProps {
    /** Roles que tienen permiso para ver el contenido */
    allowed: UserRole[];
    children: ReactNode;
    /**
     * 'hide'     → Oculta el elemento sin redirigir (ideal para botones/secciones)
     * 'redirect' → Redirige a '/' si el rol no tiene permiso (ideal para rutas completas)
     */
    mode?: 'hide' | 'redirect';
}

/**
 * Wrapper de control de acceso basado en rol (RBAC).
 * Consume profile.role del AuthContext para tomar la decisión de renderizado.
 *
 * Uso:
 *   <RoleGuard allowed={['socio', 'superadmin']}>
 *     <button>Acción privilegiada</button>
 *   </RoleGuard>
 *
 *   <RoleGuard allowed={['socio', 'superadmin']} mode="redirect">
 *     <CatalogsPage />
 *   </RoleGuard>
 */
export function RoleGuard({ allowed, children, mode = 'hide' }: RoleGuardProps) {
    const { profile, isLoading } = useAuth();

    // Mientras carga el perfil, no renderizamos nada para evitar flashes
    if (isLoading) return null;

    const hasPermission = profile?.role ? allowed.includes(profile.role) : false;

    if (!hasPermission) {
        if (mode === 'redirect') {
            return <Navigate to="/" replace />;
        }
        // mode === 'hide': simplemente no renderiza nada
        return null;
    }

    return <>{children}</>;
}
