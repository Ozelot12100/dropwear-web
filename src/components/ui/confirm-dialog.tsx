import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    isPending?: boolean;
    error?: string | null;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de confirmación reutilizable (reemplazo de `confirm()` nativo).
 * Muestra el error inline en lugar de `alert()` y bloquea mientras la acción corre.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Eliminar',
    isPending = false,
    error,
    onConfirm,
    onOpenChange,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
                    )}
                </DialogHeader>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
                        {isPending ? 'Eliminando…' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
