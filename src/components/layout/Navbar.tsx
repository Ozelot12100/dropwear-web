import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { RoleGuard } from './RoleGuard';
import { LogOut, LayoutDashboard, BookOpen, ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Logo from '../../assets/logo.png';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
        isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`;

export function Navbar() {
    const { profile, signOut } = useAuth();

    return (
        <nav className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center gap-6">
                    {/* Logo */}
                    <div className="flex shrink-0 items-center gap-2">
                        <img src={Logo} alt="DropWear Logo" className="h-8 w-auto" />
                        <span className="font-bold text-xl tracking-tight text-gray-900">DropWear</span>
                    </div>

                    {/* Navegación central */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <NavLink to="/" end className={navLinkClass}>
                            <LayoutDashboard className="h-4 w-4" />
                            Inventario
                        </NavLink>

                        {/* Catálogos: solo socio y superadmin */}
                        <RoleGuard allowed={['socio', 'superadmin']}>
                            <NavLink to="/catalogs" className={navLinkClass}>
                                <BookOpen className="h-4 w-4" />
                                Catálogos
                            </NavLink>
                        </RoleGuard>

                        {/* Bitácora: todos los roles */}
                        <NavLink to="/logs" className={navLinkClass}>
                            <ClipboardList className="h-4 w-4" />
                            Bitácora
                        </NavLink>
                    </nav>

                    {/* Usuario + Logout */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-medium text-gray-900">
                                {profile?.full_name || 'Cargando...'}
                            </span>
                            <Badge variant="secondary" className="text-xs uppercase">
                                {profile?.role || 'Socio'}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => signOut()}
                            title="Cerrar sesión"
                        >
                            <LogOut className="h-5 w-5 text-gray-600" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}