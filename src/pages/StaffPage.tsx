import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users';
import type { UserProfile, UserRole } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { UserPlus, ShieldAlert, Users, Key, UserX, UserCheck, AlertTriangle, Shield, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks';

// ── Estilos compartidos (diseño Stitch) ───────────────────────────────────────
const selectClass =
    'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const errorBox = 'flex items-center gap-2 rounded-lg border border-status-returned/30 bg-status-returned/10 p-3 text-sm font-medium text-status-returned';
const capsLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Superadmin',
    socio: 'Socio',
    vendedor: 'Vendedor',
    repartidor: 'Repartidor',
    contador: 'Contador',
};

function formatJoinDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Pill de rol / estado (verde activo · rojo bloqueado)
function RoleBadge({ role, isActive }: { role: string; isActive: boolean }) {
    if (!isActive) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-status-returned/10 px-2.5 py-1 text-xs font-semibold text-status-returned">
                <span className="h-1.5 w-1.5 rounded-full bg-status-returned" />
                Bloqueado
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

// Avatar con inicial
function Avatar({ name, isActive }: { name?: string | null; isActive: boolean }) {
    return (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isActive ? 'bg-ink text-white' : 'bg-secondary text-muted-foreground'}`}>
            {(name?.charAt(0) ?? 'U').toUpperCase()}
        </div>
    );
}

export default function StaffPage() {
    const queryClient = useQueryClient();
    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: usersService.getUsers,
    });
    const [flash, setFlash] = useState<string | null>(null);
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
    const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
    const [banError, setBanError] = useState('');
    const [isBanning, setIsBanning] = useState(false);

    // Estado para el modal de Cambio de Rol
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [userToChangeRole, setUserToChangeRole] = useState<UserProfile | null>(null);
    const [newRole, setNewRole] = useState<UserRole>('vendedor');
    const [roleError, setRoleError] = useState('');
    const [isChangingRole, setIsChangingRole] = useState(false);

    const { user: currentUser } = useAuth();

    const [confirmPassword, setConfirmPassword] = useState('');
    const [createSuccess, setCreateSuccess] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'socio' as UserRole
    });

    // El listado se refresca invalidando la query ['users'] tras cada mutación.
    const refetchUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });

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
            await refetchUsers();
            setCreateSuccess(true);
            setTimeout(() => {
                setIsDialogOpen(false);
                resetCreateForm();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear el usuario');
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
        } catch (err) {
            setResetError(err instanceof Error ? err.message : 'Error al restablecer contraseña');
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
            await refetchUsers();
            setFlash(`Usuario ${banAction === 'ban' ? 'bloqueado' : 'desbloqueado'} correctamente.`);
            setTimeout(() => setFlash(null), 3000);
        } catch (err) {
            setBanError(err instanceof Error ? err.message : 'Error al cambiar estado del usuario');
        } finally {
            setIsBanning(false);
        }
    };

    const handleChangeRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setRoleError('');
        if (!userToChangeRole) return;

        setIsChangingRole(true);
        try {
            await usersService.updateUserRole(userToChangeRole.id, newRole);
            await refetchUsers();
            setIsRoleModalOpen(false);
            setUserToChangeRole(null);
            // Sin usar alert, feedback rápido en tabla o cerrando modal
        } catch (err) {
            setRoleError(err instanceof Error ? err.message : 'Error al cambiar rol');
        } finally {
            setIsChangingRole(false);
        }
    };

    // Acciones por colaborador (reutilizadas en tabla y tarjetas)
    const rowActions = (u: UserProfile, isActive: boolean) => (
        <div className="flex items-center gap-1">
            <button
                onClick={() => { setUserToReset(u); setIsResetModalOpen(true); setNewPassword(''); setResetError(''); }}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                title="Cambiar contraseña"
                aria-label="Cambiar contraseña"
            >
                <Key className="h-4 w-4" />
            </button>
            {currentUser?.id !== u.id && (
                <>
                    <button
                        onClick={() => { setUserToChangeRole(u); setNewRole(u.role); setIsRoleModalOpen(true); setRoleError(''); }}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                        title="Cambiar rol"
                        aria-label="Cambiar rol"
                    >
                        <Shield className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => { setUserToBan(u); setBanAction(isActive ? 'ban' : 'unban'); setIsBanModalOpen(true); setBanError(''); }}
                        className={`rounded-full p-2 transition-colors active:scale-95 ${isActive ? 'text-muted-foreground hover:bg-status-returned/10 hover:text-status-returned' : 'text-muted-foreground hover:bg-status-available/10 hover:text-status-available'}`}
                        title={isActive ? 'Bloquear acceso' : 'Desbloquear acceso'}
                        aria-label={isActive ? 'Bloquear acceso' : 'Desbloquear acceso'}
                    >
                        {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                </>
            )}
        </div>
    );

    // KPIs
    const total = users.length;
    const activos = users.filter(u => u.is_active !== false).length;
    const suspendidas = total - activos;

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-8">
            {flash && (
                <div className="flex items-center gap-2 rounded-lg border border-status-available/30 bg-status-available/10 p-3 text-sm font-medium text-status-available">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {flash}
                </div>
            )}

            {/* Encabezado */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">Gestión de Personal</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Administra los accesos y roles de los colaboradores.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetCreateForm(); }}>
                    <DialogTrigger className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                        <UserPlus className="h-4 w-4" />
                        Nuevo Colaborador
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-lg">Agregar Personal</DialogTitle>
                        </DialogHeader>

                        {createSuccess ? (
                            <div className="flex flex-col items-center gap-3 py-6 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-available/10">
                                    <CheckCircle2 className="h-6 w-6 text-status-available" />
                                </div>
                                <p className="font-medium text-ink">¡Colaborador creado exitosamente!</p>
                                <p className="text-sm text-muted-foreground">La cuenta ya está activa en el sistema.</p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className={errorBox}>
                                        <ShieldAlert className="h-4 w-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name" className={capsLabel}>Nombre Completo</Label>
                                        <Input id="full_name" name="full_name" placeholder="Ej. Juan Pérez (mín. 3 caracteres)" required minLength={3} maxLength={80} value={formData.full_name} onChange={handleChange} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className={capsLabel}>Correo Electrónico</Label>
                                        <Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" required value={formData.email} onChange={handleChange} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className={capsLabel}>Contraseña Temporal</Label>
                                        <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} value={formData.password} onChange={handleChange} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_password" className={capsLabel}>Confirmar Contraseña</Label>
                                        <Input id="confirm_password" type="password" placeholder="Repite la contraseña" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className={capsLabel}>Rol en el Sistema</Label>
                                        <select id="role" name="role" className={selectClass} value={formData.role} onChange={handleChange} required>
                                            <option value="socio">Socio (Operaciones)</option>
                                            <option value="vendedor">Vendedor (Limitado)</option>
                                            <option value="repartidor">Repartidor (Entregas)</option>
                                            <option value="contador">Contador (Lectura)</option>
                                            <option value="superadmin">Super Administrador</option>
                                        </select>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
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
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Key className="h-5 w-5" />
                                Restablecer Contraseña
                            </DialogTitle>
                        </DialogHeader>

                        {resetSuccess ? (
                            <div className="flex flex-col items-center gap-3 py-6 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-available/10">
                                    <CheckCircle2 className="h-6 w-6 text-status-available" />
                                </div>
                                <p className="font-medium text-ink">¡Contraseña actualizada!</p>
                                <p className="text-sm text-muted-foreground">{userToReset?.full_name} ya puede usar su nueva clave.</p>
                            </div>
                        ) : (
                            <>
                                {resetError && (
                                    <div className={errorBox}>
                                        <ShieldAlert className="h-4 w-4 shrink-0" />
                                        <span>{resetError}</span>
                                    </div>
                                )}
                                <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Nueva contraseña para <strong className="text-ink">{userToReset?.full_name}</strong>.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="new_pwd" className={capsLabel}>Nueva Contraseña</Label>
                                        <Input id="new_pwd" type="password" placeholder="Mínimo 6 caracteres" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_reset_pwd" className={capsLabel}>Confirmar Contraseña</Label>
                                        <Input id="confirm_reset_pwd" type="password" placeholder="Repite la contraseña" required value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} className="h-11" />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isResetting}>
                                        {isResetting ? 'Actualizando...' : 'Actualizar Contraseña'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal para Bloquear/Desbloquear */}
                <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg text-status-returned">
                                <AlertTriangle className="h-5 w-5" />
                                {banAction === 'ban' ? 'Bloquear Usuario' : 'Desbloquear Usuario'}
                            </DialogTitle>
                        </DialogHeader>

                        {banError && (
                            <div className={errorBox}>
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                <span>{banError}</span>
                            </div>
                        )}

                        <form onSubmit={handleToggleBan} className="space-y-4 py-4">
                            <p className="text-sm text-muted-foreground">
                                {banAction === 'ban'
                                    ? `¿Estás seguro de que deseas revocar el acceso de ${userToBan?.full_name}? Ya no podrá iniciar sesión en la plataforma, pero su historial se mantendrá intacto.`
                                    : `¿Deseas restaurar el acceso de ${userToBan?.full_name}? Podrá volver a iniciar sesión con normalidad.`
                                }
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setIsBanModalOpen(false)} disabled={isBanning}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className={banAction === 'ban' ? 'bg-status-returned text-white hover:bg-status-returned/90' : 'bg-status-available text-white hover:bg-status-available/90'}
                                    disabled={isBanning}
                                >
                                    {isBanning ? 'Procesando...' : (banAction === 'ban' ? 'Sí, Bloquear' : 'Sí, Desbloquear')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Modal para Cambiar Rol */}
                <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Shield className="h-5 w-5 text-brand" />
                                Cambiar Rol de Usuario
                            </DialogTitle>
                        </DialogHeader>

                        {roleError && (
                            <div className={errorBox}>
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                <span>{roleError}</span>
                            </div>
                        )}

                        <form onSubmit={handleChangeRole} className="space-y-4 py-4">
                            <p className="text-sm text-muted-foreground">
                                Selecciona el nuevo rol para <strong className="text-ink">{userToChangeRole?.full_name}</strong>.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="new_role" className={capsLabel}>Nuevo Rol</Label>
                                <select id="new_role" className={selectClass} value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} required>
                                    <option value="socio">Socio (Operaciones)</option>
                                    <option value="vendedor">Vendedor (Limitado)</option>
                                    <option value="repartidor">Repartidor (Entregas)</option>
                                    <option value="contador">Contador (Lectura)</option>
                                    <option value="superadmin">Super Administrador</option>
                                </select>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)} disabled={isChangingRole}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isChangingRole}>
                                    {isChangingRole ? 'Actualizando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Vista MÓVIL: tarjetas ──────────────────────────────── */}
            <div className="space-y-3 sm:hidden">
                {isLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Cargando personal...</div>
                ) : isError ? (
                    <div className="py-10 text-center text-sm text-status-returned">Error al cargar el personal.</div>
                ) : users.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No hay colaboradores registrados.</div>
                ) : (
                    users.map((u) => {
                        const isActive = u.is_active !== false;
                        return (
                            <div key={u.id} className={`rounded-xl border border-hairline bg-card p-4 shadow-soft ${!isActive ? 'opacity-70' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <Avatar name={u.full_name} isActive={isActive} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate font-semibold ${isActive ? 'text-ink' : 'text-muted-foreground line-through'}`}>{u.full_name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">ID: {u.id.split('-')[0]}</p>
                                    </div>
                                    <RoleBadge role={u.role} isActive={isActive} />
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                                    <span className="text-xs text-muted-foreground">Ingreso: {formatJoinDate(u.created_at)}</span>
                                    {rowActions(u, isActive)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Vista DESKTOP: tabla ───────────────────────────────── */}
            <div className="hidden overflow-hidden rounded-xl border border-hairline bg-card shadow-soft sm:block">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className={`w-[320px] ${capsLabel}`}>Nombre</TableHead>
                            <TableHead className={capsLabel}>Rol</TableHead>
                            <TableHead className={capsLabel}>Fecha de ingreso</TableHead>
                            <TableHead className={`text-right ${capsLabel}`}>ID Sistema</TableHead>
                            <TableHead className={`w-[120px] text-center ${capsLabel}`}>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Cargando personal...</TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="h-32 text-center text-status-returned">Error al cargar el personal. Recarga la página.</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay colaboradores registrados.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => {
                                const isActive = u.is_active !== false; // false = colaborador bloqueado
                                return (
                                    <TableRow key={u.id} className={`border-hairline ${!isActive ? 'bg-status-returned/[0.03]' : 'hover:bg-secondary/60'}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={u.full_name} isActive={isActive} />
                                                <span className={`font-semibold ${isActive ? 'text-ink' : 'text-muted-foreground line-through'}`}>{u.full_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell><RoleBadge role={u.role} isActive={isActive} /></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{formatJoinDate(u.created_at)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{u.id.split('-')[0]}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center">{rowActions(u, isActive)}</div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                {!isLoading && !isError && users.length > 0 && (
                    <div className="border-t border-hairline px-4 py-3 text-xs text-muted-foreground">
                        Mostrando {users.length} colaborador{users.length !== 1 ? 'es' : ''}
                    </div>
                )}
            </div>

            {/* ── KPIs de personal ───────────────────────────────────── */}
            {!isLoading && !isError && users.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="relative overflow-hidden rounded-xl border border-hairline bg-card p-5 shadow-soft">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Total colaboradores</span>
                        </div>
                        <div className="mt-2 font-mono text-[28px] leading-none text-ink">{total}</div>
                        <p className="mt-2 text-xs text-muted-foreground">Registrados en el sistema</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-hairline bg-card p-5 shadow-soft">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Accesos activos</span>
                        </div>
                        <div className="mt-2 font-mono text-[28px] leading-none text-status-available">{activos}</div>
                        <p className="mt-2 text-xs text-muted-foreground">Pueden iniciar sesión</p>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-hairline bg-card p-5 shadow-soft">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Cuentas suspendidas</span>
                        </div>
                        <div className={`mt-2 font-mono text-[28px] leading-none ${suspendidas > 0 ? 'text-status-returned' : 'text-ink'}`}>{suspendidas}</div>
                        <p className="mt-2 text-xs text-muted-foreground">Acceso revocado</p>
                    </div>
                </div>
            )}
        </div>
    );
}
