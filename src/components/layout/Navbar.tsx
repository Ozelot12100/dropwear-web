import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { RoleGuard } from './RoleGuard';
import { LogOut, LayoutDashboard, BookOpen, ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PasswordChangeModal } from '../auth/PasswordChangeModal';
import Logo from '../../assets/logo.png';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
        isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`;

export function Navbar() {
    const { profile, signOut } = useAuth();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-medium text-gray-900">
                                {profile?.full_name || 'Cargando...'}
                            </span>
                            <Badge variant="secondary" className="text-xs uppercase">
                                {profile?.role || 'Socio'}
                            </Badge>
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gray-900 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 p-0 overflow-hidden transition-colors">
                                <span className="text-white font-bold text-lg">
                                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.full_name || 'Usuario'}</p>
                                        <p className="text-xs leading-none text-gray-500">
                                            Rol: {profile?.role || 'socio'}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="cursor-pointer">
                                    Cambiar contraseña
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
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