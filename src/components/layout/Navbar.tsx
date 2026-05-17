import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { RoleGuard } from './RoleGuard';
import { LogOut, LayoutDashboard, BookOpen, ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Logo from '../../assets/logo.png';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
        isActive
            ? 'bg-gray-900 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
    socio:      'bg-indigo-100 text-indigo-700 border-indigo-200',
    vendedor:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    repartidor: 'bg-amber-100 text-amber-700 border-amber-200',
    contador:   'bg-slate-100 text-slate-700 border-slate-200',
};

export function Navbar() {
    const { profile, signOut } = useAuth();
    const roleClass = profile?.role ? ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';

    return (
        <nav className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/85 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center gap-4">
                    {/* Logo */}
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 p-1 ring-1 ring-gray-900/10">
                            <img src={Logo} alt="DropWear" className="h-full w-auto rounded-md" style={{ filter: 'invert(1)' }} />
                        </div>
                        <span className="hidden sm:inline font-bold text-lg tracking-tight text-gray-900">DropWear</span>
                    </div>

                    {/* Nav central (desktop) */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <NavLink to="/" end className={navLinkClass}>
                            <LayoutDashboard className="h-4 w-4" />
                            Inventario
                        </NavLink>
                        <RoleGuard allowed={['socio', 'superadmin']}>
                            <NavLink to="/catalogs" className={navLinkClass}>
                                <BookOpen className="h-4 w-4" />
                                Catálogos
                            </NavLink>
                        </RoleGuard>
                        <NavLink to="/logs" className={navLinkClass}>
                            <ClipboardList className="h-4 w-4" />
                            Bitácora
                        </NavLink>
                    </nav>

                    {/* Usuario */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden md:flex flex-col items-end leading-tight">
                            <span className="text-sm font-medium text-gray-900">
                                {profile?.full_name ?? '—'}
                            </span>
                            <Badge className={`mt-0.5 text-[10px] uppercase tracking-wider border ${roleClass}`}>
                                {profile?.role ?? '—'}
                            </Badge>
                        </div>
                        {profile?.role && (
                            <Badge className={`md:hidden text-[10px] uppercase tracking-wider border ${roleClass}`}>
                                {profile.role}
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => signOut()}
                            title="Cerrar sesión"
                            className="hover:bg-rose-50 hover:text-rose-600"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
