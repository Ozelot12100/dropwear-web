import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    loading?: boolean;
}

/**
 * Reemplazo accesible de `window.confirm()`. Soporta variante destructive y loading.
 */
export function ConfirmDialog({
    open, onOpenChange, title, description,
    confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
    destructive = false, onConfirm, loading,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        {destructive && (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <DialogTitle>{title}</DialogTitle>
                            {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="h-10 sm:h-8"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`h-10 sm:h-8 min-w-[120px] ${destructive ? 'bg-rose-600 text-white hover:bg-rose-700' : ''}`}
                    >
                        {loading ? 'Procesando…' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
