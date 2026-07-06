import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { RoleGuard } from './RoleGuard';
import { LogOut, LayoutDashboard, BookOpen, ClipboardList, Users, Package, Wallet } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from "../ui/dropdown-menu";
import { PasswordChangeModal } from '../auth/PasswordChangeModal';
import Logo from '../../assets/logo.png';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
        isActive
            ? 'bg-secondary text-ink'
            : 'text-muted-foreground hover:text-ink hover:bg-secondary'
    }`;

export function Navbar() {
    const { profile, signOut } = useAuth();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <nav className="border-b border-hairline bg-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center gap-6">
                    {/* Logo */}
                    <div className="flex shrink-0 items-center gap-2">
                        <img src={Logo} alt="DropWear Logo" className="h-8 w-auto object-contain" />
                        <span className="font-heading font-bold text-xl tracking-tight text-ink">DropWear</span>
                    </div>

                    {/* Navegación central */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <NavLink to="/" end className={navLinkClass}>
                            <LayoutDashboard className="h-4 w-4" />
                            Inicio
                        </NavLink>

                        <NavLink to="/inventory" className={navLinkClass}>
                            <Package className="h-4 w-4" />
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

                        {/* Gastos: solo roles financieros */}
                        <RoleGuard allowed={['superadmin', 'socio', 'contador']}>
                            <NavLink to="/expenses" className={navLinkClass}>
                                <Wallet className="h-4 w-4" />
                                Gastos
                            </NavLink>
                        </RoleGuard>

                        {/* Staff: solo superadmin */}
                        <RoleGuard allowed={['superadmin']}>
                            <NavLink to="/staff" className={navLinkClass}>
                                <Users className="h-4 w-4" />
                                Personal
                            </NavLink>
                        </RoleGuard>
                    </nav>

                    {/* Usuario + Logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-medium text-ink">
                                {profile?.full_name || 'Cargando...'}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                                {profile?.role || 'Socio'}
                            </Badge>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger className="relative flex items-center justify-center h-10 w-10 rounded-full bg-ink hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 p-0 overflow-hidden transition-colors">
                                <span className="text-white font-bold text-lg">
                                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-card">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{profile?.full_name || 'Usuario'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                Rol: {profile?.role || 'socio'}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                                    Mi Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="cursor-pointer">
                                    Cambiar contraseña
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-status-returned focus:text-status-returned focus:bg-status-returned/10">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Cerrar sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <PasswordChangeModal 
                            isOpen={isPasswordModalOpen} 
                            onClose={() => setIsPasswordModalOpen(false)} 
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
}