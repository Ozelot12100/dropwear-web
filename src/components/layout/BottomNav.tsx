import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { RoleGuard } from './RoleGuard';
import { LayoutDashboard, BookOpen, ClipboardList } from 'lucide-react';

const TABS = [
    {
        to: '/',
        label: 'Inventario',
        icon: LayoutDashboard,
        roles: null, // accesible para todos
    },
    {
        to: '/catalogs',
        label: 'Catálogos',
        icon: BookOpen,
        roles: ['socio', 'superadmin'] as const,
    },
    {
        to: '/logs',
        label: 'Bitácora',
        icon: ClipboardList,
        roles: null,
    },
];

/**
 * Barra de navegación inferior para móvil.
 * Diseñada para operación a una sola mano con botones grandes y táctiles.
 * Solo visible en pantallas menores a `sm` (640px).
 */
export function BottomNav() {
    const { profile } = useAuth();

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
            <div className="flex">
                {TABS.map(({ to, label, icon: Icon, roles }) => {
                    const isRestricted = roles !== null;
                    const hasAccess = !isRestricted || (profile?.role && roles.includes(profile.role as typeof roles[number]));

                    if (!hasAccess) return null;

                    return (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                                    isActive
                                        ? 'text-gray-900'
                                        : 'text-gray-400'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-gray-100' : ''}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-[10px] font-medium">{label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
