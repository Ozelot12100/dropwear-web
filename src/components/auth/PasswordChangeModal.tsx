import { useState } from 'react';
import { useAuth } from '../../hooks';
import { usersService } from '../../services/users';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AlertCircle, CheckCircle2, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';

const capsLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { user } = useAuth();

  const handleReset = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) throw new Error("No hay un usuario activo detectado.");

      // En lugar de usar supabase.auth.updateUser (que tiene un bug que congela la promesa),
      // invocamos nuestra propia Edge Function que hace el cambio seguro desde el backend.
      await usersService.resetPassword(user.id, newPassword);

      setSuccess(true);
      // Cerrar la modal automáticamente después de mostrar el mensaje
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err) {
      console.error("Error al actualizar contraseña:", err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Introduce tu nueva contraseña para actualizar tus credenciales.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-available/10">
              <CheckCircle2 className="h-6 w-6 text-status-available" />
            </div>
            <p className="text-lg font-medium text-ink">¡Contraseña actualizada!</p>
            <p className="text-sm text-muted-foreground">
              Tu nueva contraseña ya está activa para tu próximo inicio de sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-status-returned/30 bg-status-returned/10 p-3 text-sm text-status-returned animate-in fade-in">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password" className={capsLabel}>Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className={capsLabel}>Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Vuelve a escribir la contraseña"
                  required
                  disabled={loading}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Contraseña
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
