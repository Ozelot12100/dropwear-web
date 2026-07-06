import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { LayoutDashboard, BookOpen, ClipboardList, Package, Users, Wallet, Scale } from 'lucide-react';

const TABS = [
    {
        to: '/',
        label: 'Inicio',
        icon: LayoutDashboard,
        roles: null, // accesible para todos
    },
    {
        to: '/inventory',
        label: 'Inventario',
        icon: Package,
        roles: null,
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
    {
        to: '/expenses',
        label: 'Gastos',
        icon: Wallet,
        roles: ['superadmin', 'socio', 'contador'] as const,
    },
    {
        to: '/corte',
        label: 'Corte',
        icon: Scale,
        roles: ['superadmin', 'socio', 'contador'] as const,
    },
    {
        to: '/staff',
        label: 'Personal',
        icon: Users,
        roles: ['superadmin'] as const,
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
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-hairline safe-bottom">
            <div className="flex px-2 py-1.5">
                {TABS.map(({ to, label, icon: Icon, roles }) => {
                    const isRestricted = roles !== null;
                    const hasAccess = !isRestricted || (profile?.role && (roles as readonly string[]).includes(profile.role));

                    if (!hasAccess) return null;

                    return (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors active:scale-90 ${isActive
                                    ? 'text-ink'
                                    : 'text-muted-foreground'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-secondary' : ''}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
