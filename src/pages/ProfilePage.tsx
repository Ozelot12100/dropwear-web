import { useState, useEffect } from 'react';
import { useAuth } from '../hooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordChangeModal } from '../components/auth/PasswordChangeModal';
import { Mail, Shield, Calendar, KeyRound, Pencil, Check, X, Loader2, LogOut, User } from 'lucide-react';
import { usersService } from '../services/users';

const capsLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export default function ProfilePage() {
    const { user, profile, refreshProfile, signOut } = useAuth();
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
            await usersService.updateProfileName(newName.trim());
            await refreshProfile();
            setIsEditingName(false);
            setMessage({ text: 'Nombre actualizado correctamente.', type: 'success' });

            // Ocultar el mensaje de éxito después de 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ text: error instanceof Error ? error.message : 'Error al actualizar nombre.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Desconocida';
        return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateString));
    };

    const initial = (profile?.full_name?.charAt(0) ?? 'U').toUpperCase();

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-8">
            <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">Mi Perfil</h1>
                <p className="mt-1 text-sm text-muted-foreground">Gestiona tu información personal y seguridad.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Tarjeta de identidad ──────────────────────────── */}
                <div className="lg:col-span-1">
                    <div className="flex flex-col items-center rounded-xl border border-hairline bg-card p-6 text-center shadow-soft">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink text-2xl font-bold text-white">
                            {initial}
                        </div>
                        <h2 className="mt-4 font-heading text-lg font-bold text-ink">{profile?.full_name || 'Cargando...'}</h2>
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
                            {profile?.role || 'Desconocido'}
                        </span>

                        <div className="mt-6 w-full space-y-4 text-left">
                            <div className="rounded-lg border border-hairline bg-secondary/50 p-3">
                                <p className={capsLabel}>ID Sistema</p>
                                <p className="mt-1 font-mono text-sm text-ink">{user?.id?.split('-')[0] ?? '—'}</p>
                            </div>
                            <div className="px-1">
                                <p className={capsLabel}>Miembro desde</p>
                                <p className="mt-1 text-sm font-medium text-ink">{formatDate(user?.created_at)}</p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => signOut()}
                            className="mt-6 w-full gap-2 border-status-returned/30 text-status-returned hover:bg-status-returned/10 hover:text-status-returned"
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>

                {/* ── Información + Seguridad ────────────────────────── */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Información de Cuenta */}
                    <div className="rounded-xl border border-hairline bg-card p-6 shadow-soft">
                        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
                            <User className="h-5 w-5 text-brand" />
                            Información de Cuenta
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">Tus datos básicos y nivel de acceso en DropWear.</p>

                        <div className="mt-6 space-y-5">
                            {/* Nombre (editable) */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className={capsLabel}>Nombre completo</span>
                                    {!isEditingName && (
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
                                        >
                                            <Pencil className="h-3 w-3" /> Editar
                                        </button>
                                    )}
                                </div>
                                {isEditingName ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <Input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="h-10 max-w-[320px]"
                                            disabled={isSaving}
                                            autoFocus
                                            maxLength={80}
                                            placeholder="Tu nombre completo"
                                        />
                                        <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSaveName} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-10 w-10 shrink-0"
                                            onClick={() => { setIsEditingName(false); setNewName(profile?.full_name || ''); setMessage(null); }}
                                            disabled={isSaving}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="mt-1.5 text-sm font-semibold text-ink">{profile?.full_name || 'Cargando...'}</p>
                                )}
                                {message && (
                                    <p className={`mt-1.5 text-xs font-medium ${message.type === 'success' ? 'text-status-available' : 'text-status-returned'}`}>
                                        {message.text}
                                    </p>
                                )}
                            </div>

                            {/* Correo (solo lectura) */}
                            <div>
                                <span className={`flex items-center gap-1.5 ${capsLabel}`}>
                                    <Mail className="h-3.5 w-3.5" /> Correo electrónico
                                </span>
                                <p className="mt-1.5 truncate text-sm font-semibold text-ink" title={user?.email}>{user?.email || 'Cargando...'}</p>
                            </div>

                            {/* Rol + Fecha (solo lectura) */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <span className={`flex items-center gap-1.5 ${capsLabel}`}>
                                        <Shield className="h-3.5 w-3.5" /> Rol de usuario
                                    </span>
                                    <p className="mt-1.5 text-sm font-semibold capitalize text-ink">{profile?.role || 'Desconocido'}</p>
                                </div>
                                <div>
                                    <span className={`flex items-center gap-1.5 ${capsLabel}`}>
                                        <Calendar className="h-3.5 w-3.5" /> Miembro desde
                                    </span>
                                    <p className="mt-1.5 text-sm font-semibold text-ink">{formatDate(user?.created_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seguridad */}
                    <div className="rounded-xl border border-hairline bg-card p-6 shadow-soft">
                        <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
                            <KeyRound className="h-5 w-5" />
                            Seguridad
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">Opciones para mantener tu cuenta segura.</p>

                        <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-lg border border-hairline bg-secondary/40 p-4 sm:flex-row sm:items-center">
                            <div>
                                <h4 className="text-sm font-semibold text-ink">Contraseña</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Usa una contraseña segura y no la compartas con nadie.
                                </p>
                            </div>
                            <Button
                                onClick={() => setIsPasswordModalOpen(true)}
                                variant="outline"
                                className="w-full shrink-0 gap-2 sm:w-auto"
                            >
                                <KeyRound className="h-4 w-4" />
                                Cambiar Contraseña
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <PasswordChangeModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
