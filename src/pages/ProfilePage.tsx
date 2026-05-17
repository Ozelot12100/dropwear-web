import { useState, useEffect } from 'react';
import { useAuth } from '../hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordChangeModal } from '../components/auth/PasswordChangeModal';
import { User, Mail, Shield, Calendar, KeyRound, Pencil, Check, X, Loader2 } from 'lucide-react';
import { usersService } from '../services/users';

export default function ProfilePage() {
    const { user, profile, refreshProfile } = useAuth();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Edit name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (profile?.full_name) {
            setNewName(profile.full_name);
        }
    }, [profile?.full_name]);

    const handleSaveName = async () => {
        if (!user || newName.trim().length < 3) {
            setMessage({ text: 'El nombre debe tener al menos 3 caracteres.', type: 'error' });
            return;
        }

        try {
            setIsSaving(true);
            setMessage(null);
            await usersService.updateProfileName(user.id, newName.trim());
            await refreshProfile();
            setIsEditingName(false);
            setMessage({ text: 'Nombre actualizado correctamente.', type: 'success' });
            
            // Ocultar el mensaje de éxito después de 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ text: error.message || 'Error al actualizar nombre.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Desconocida';
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-8">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-full">
                    <User className="w-8 h-8 text-gray-900" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mi Perfil</h1>
                    <p className="text-sm text-gray-500">Gestiona tu información personal y seguridad.</p>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <Card className="sm:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Información de la Cuenta
                        </CardTitle>
                        <CardDescription>
                            Tus datos básicos y nivel de acceso en el sistema DropWear.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" /> Nombre Completo
                                    </span>
                                    {!isEditingName && (
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => setIsEditingName(true)}>
                                            <Pencil className="w-3 h-3 mr-1" /> Editar
                                        </Button>
                                    )}
                                </div>
                                
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input 
                                            value={newName} 
                                            onChange={(e) => setNewName(e.target.value)} 
                                            className="h-8 max-w-[300px]"
                                            disabled={isSaving}
                                            autoFocus
                                            placeholder="Tu nombre completo"
                                        />
                                        <Button size="sm" className="h-8 w-8 p-0" variant="default" onClick={handleSaveName} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </Button>
                                        <Button size="sm" className="h-8 w-8 p-0" variant="outline" onClick={() => { setIsEditingName(false); setNewName(profile?.full_name || ''); setMessage(null); }} disabled={isSaving}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Cargando...'}</p>
                                )}

                                {message && (
                                    <p className={`text-xs mt-1 font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        {message.text}
                                    </p>
                                )}
                            </div>
                            
                            <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                                </span>
                                <p className="text-sm font-semibold text-gray-900 truncate" title={user?.email}>{user?.email || 'Cargando...'}</p>
                            </div>

                            <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" /> Rol de Usuario
                                </span>
                                <div>
                                    <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700 capitalize">
                                        {profile?.role || 'Desconocido'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Miembro Desde
                                </span>
                                <p className="text-sm font-medium text-gray-900">{formatDate(user?.created_at)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="sm:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-gray-900" />
                            Seguridad
                        </CardTitle>
                        <CardDescription>
                            Opciones para mantener tu cuenta segura.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg bg-white">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Contraseña</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Te recomendamos usar una contraseña segura y no compartirla con nadie.
                                </p>
                            </div>
                            <Button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                variant="outline" 
                                className="shrink-0 w-full sm:w-auto border-gray-300 hover:bg-gray-50"
                            >
                                Cambiar Contraseña
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <PasswordChangeModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </div>
    );
}
