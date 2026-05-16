import { useAuth } from '../../hooks';
import { Package, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function Navbar() {
    const { profile, signOut } = useAuth();

    return (
        <nav className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo y Branding */}
                    <div className="flex shrink-0 items-center gap-2">
                        <Package className="h-8 w-8 text-indigo-600" />
                        <span className="font-bold text-xl tracking-tight text-gray-900">
                            DropWear
                        </span>
                    </div>

                    {/* User Info y Controles */}
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