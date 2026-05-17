import React, { useState, useEffect } from 'react';
import { usersService } from '../services/users';
import type { UserProfile, UserRole } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { UserPlus, ShieldAlert, Users, Key, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks';

export default function StaffPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState('');

    // Estado para el modal de restablecer contraseña
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<UserProfile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // Estado para el modal de Bloqueo
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<UserProfile | null>(null);
    const [banAction, setBanAction] = useState<'ban'|'unban'>('ban');
    const [banError, setBanError] = useState('');
    const [isBanning, setIsBanning] = useState(false);

    const { user: currentUser } = useAuth();

    const [confirmPassword, setConfirmPassword] = useState('');
    const [createSuccess, setCreateSuccess] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'socio' as UserRole
    });

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await usersService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetCreateForm = () => {
        setFormData({ email: '', password: '', full_name: '', role: 'socio' });
        setConfirmPassword('');
        setError('');
        setCreateSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validaciones JS
        if (formData.full_name.trim().length < 3) {
            setError('El nombre debe tener al menos 3 caracteres.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Ingresa un correo electrónico válido.');
            return;
        }
        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (formData.password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsSubmitting(true);
        try {
            await usersService.createUser(formData);
            await loadUsers();
            setCreateSuccess(true);
            setTimeout(() => {
                setIsDialogOpen(false);
                resetCreateForm();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al crear el usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError('');
        if (!userToReset) return;

        // Validaciones JS
        if (newPassword.length < 6) {
            setResetError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== resetConfirmPassword) {
            setResetError('Las contraseñas no coinciden.');
            return;
        }

        setIsResetting(true);
        try {
            await usersService.resetPassword(userToReset.id, newPassword);
            setResetSuccess(true);
            setTimeout(() => {
                setIsResetModalOpen(false);
                setUserToReset(null);
                setNewPassword('');
                setResetConfirmPassword('');
                setResetSuccess(false);
            }, 2000);
        } catch (err: any) {
            setResetError(err.message || 'Error al restablecer contraseña');
        } finally {
            setIsResetting(false);
        }
    };

    const handleToggleBan = async (e: React.FormEvent) => {
        e.preventDefault();
        setBanError('');
        if (!userToBan) return;
        
        setIsBanning(true);
        try {
            await usersService.toggleUserStatus(userToBan.id, banAction);
            setIsBanModalOpen(false);
            setUserToBan(null);
            await loadUsers();
            alert(`Usuario ${banAction === 'ban' ? 'bloqueado' : 'desbloqueado'} correctamente.`);
        } catch (err: any) {
            setBanError(err.message || 'Error al cambiar estado del usuario');
        } finally {
            setIsBanning(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-6 h-6 text-gray-900" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Personal</h1>
                        <p className="text-sm text-gray-500">Administra los accesos y roles de los colaboradores.</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetCreateForm(); }}>
                    <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Nuevo Colaborador
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Agregar Personal</DialogTitle>
                        </DialogHeader>

                        {createSuccess ? (
                            <div className="py-6 flex flex-col items-center gap-3 text-center">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Key className="h-6 w-6 text-green-600" />
                                </div>
                                <p className="font-medium text-gray-900">¡Colaborador creado exitosamente!</p>
                                <p className="text-sm text-gray-500">La cuenta ya está activa en el sistema.</p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">{error}</span>
                                    </div>
                                )}
                                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Nombre Completo</Label>
                                        <Input
                                            id="full_name"
                                            name="full_name"
                                            placeholder="Ej. Juan Pérez (mín. 3 caracteres)"
                                            required
                                            minLength={3}
                                            value={formData.full_name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo Electrónico</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Contraseña Temporal</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                                        <Input
                                            id="confirm_password"
                                            type="password"
                                            placeholder="Repite la contraseña"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Rol en el Sistema</Label>
                                        <select
                                            id="role"
                                            name="role"
                                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.role}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="socio">Socio (Operaciones)</option>
                                            <option value="vendedor">Vendedor (Limitado)</option>
                                            <option value="repartidor">Repartidor (Entregas)</option>
                                            <option value="contador">Contador (Lectura)</option>
                                            <option value="superadmin">Super Administrador</option>
                                        </select>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gray-900 hover:bg-black text-white"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Creando Usuario...' : 'Guardar Colaborador'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal para restablecer contraseña */}
                <Dialog open={isResetModalOpen} onOpenChange={(open) => {
                    setIsResetModalOpen(open);
                    if (!open) { setNewPassword(''); setResetConfirmPassword(''); setResetError(''); setResetSuccess(false); }
                }}>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Restablecer Contraseña</DialogTitle>
                        </DialogHeader>

                        {resetSuccess ? (
                            <div className="py-6 flex flex-col items-center gap-3 text-center">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Key className="h-6 w-6 text-green-600" />
                                </div>
                                <p className="font-medium text-gray-900">¡Contraseña actualizada!</p>
                                <p className="text-sm text-gray-500">{userToReset?.full_name} ya puede usar su nueva clave.</p>
                            </div>
                        ) : (
                            <>
                                {resetError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">{resetError}</span>
                                    </div>
                                )}
                                <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                                    <p className="text-sm text-gray-500">
                                        Nueva contraseña para <strong>{userToReset?.full_name}</strong>.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="new_pwd">Nueva Contraseña</Label>
                                        <Input
                                            id="new_pwd"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_reset_pwd">Confirmar Contraseña</Label>
                                        <Input
                                            id="confirm_reset_pwd"
                                            type="password"
                                            placeholder="Repite la contraseña"
                                            required
                                            value={resetConfirmPassword}
                                            onChange={(e) => setResetConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gray-900 hover:bg-black text-white"
                                        disabled={isResetting}
                                    >
                                        {isResetting ? 'Actualizando...' : 'Actualizar Contraseña'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal para Bloquear/Desbloquear */}
                <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                {banAction === 'ban' ? 'Bloquear Usuario' : 'Desbloquear Usuario'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        {banError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{banError}</span>
                            </div>
                        )}

                        <form onSubmit={handleToggleBan} className="space-y-4 py-4">
                            <p className="text-sm text-gray-700 mb-4">
                                {banAction === 'ban' 
                                    ? `¿Estás seguro de que deseas revocar el acceso de ${userToBan?.full_name}? Ya no podrá iniciar sesión en la plataforma, pero su historial se mantendrá intacto.`
                                    : `¿Deseas restaurar el acceso de ${userToBan?.full_name}? Podrá volver a iniciar sesión con normalidad.`
                                }
                            </p>
                            <div className="flex gap-3 justify-end mt-6">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsBanModalOpen(false)}
                                    disabled={isBanning}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    type="submit" 
                                    className={banAction === 'ban' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"} 
                                    disabled={isBanning}
                                >
                                    {isBanning ? 'Procesando...' : (banAction === 'ban' ? 'Sí, Bloquear' : 'Sí, Desbloquear')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[300px]">Nombre</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Fecha de Ingreso</TableHead>
                            <TableHead className="text-right">ID del Sistema</TableHead>
                            <TableHead className="text-center w-[80px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-gray-500">Cargando personal...</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-gray-500">No hay colaboradores registrados.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const isActive = (user as any).is_active !== false; // Si no existe la columna asume activo
                                return (
                                <TableRow key={user.id} className={!isActive ? "bg-red-50/50 opacity-80" : "hover:bg-gray-50/50"}>
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            {user.full_name}
                                            {!isActive && (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[9px] uppercase">Bloqueado</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={user.role === 'superadmin' ? 'destructive' : 'secondary'}
                                            className="uppercase text-[10px] tracking-wider"
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {new Date(user.created_at || '').toLocaleDateString('es-MX', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-400 text-xs font-mono">
                                        {user.id.split('-')[0]}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setUserToReset(user);
                                                    setIsResetModalOpen(true);
                                                    setNewPassword('');
                                                    setResetError('');
                                                }}
                                                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                title="Cambiar contraseña"
                                            >
                                                <Key className="w-4 h-4" />
                                            </Button>

                                            {currentUser?.id !== user.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setUserToBan(user);
                                                        setBanAction(isActive ? 'ban' : 'unban');
                                                        setIsBanModalOpen(true);
                                                        setBanError('');
                                                    }}
                                                    className={isActive ? "text-gray-500 hover:text-red-600 hover:bg-red-50" : "text-gray-500 hover:text-green-600 hover:bg-green-50"}
                                                    title={isActive ? "Bloquear acceso" : "Desbloquear acceso"}
                                                >
                                                    {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
