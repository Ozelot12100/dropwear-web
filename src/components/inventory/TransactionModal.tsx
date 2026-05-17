import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventory';
import { useAuth, useToast } from '../../hooks';
import { parseError } from '../../lib/errors';
import { validators } from '../../lib/validation';
import type { ItemStatus, InventoryItemWithRelations } from '../../types';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { StatusPicker, STATUS_OPTIONS } from './StatusPicker';
import { CircleDollarSign, MessageSquare, AlertTriangle } from 'lucide-react';

interface Props {
    item: InventoryItemWithRelations | null;
    isOpen: boolean;
    onClose: () => void;
}

const currencyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export function TransactionModal({ item, isOpen, onClose }: Props) {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [selectedStatus, setSelectedStatus] = useState<ItemStatus | ''>('');
    const [priceSold, setPriceSold] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ status?: string; price?: string; notes?: string }>({});

    // Resetea al abrir/cerrar
    useEffect(() => {
        if (!isOpen) return;
        setSelectedStatus('');
        setPriceSold(item?.products?.base_price ? String(item.products.base_price) : '');
        setNotes('');
        setFieldErrors({});
    }, [isOpen, item?.id, item?.products?.base_price]);

    const handleClose = (open: boolean) => {
        if (!open) onClose();
    };

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('NO_AUTH:');
            if (!item) throw new Error('ITEM_NOT_FOUND:');

            // Validación local antes de pegarle al server
            const statusCheck = validators.status(selectedStatus);
            if (!statusCheck.ok) { setFieldErrors({ status: statusCheck.error }); throw new Error(statusCheck.error); }

            let parsedPrice: number | null = null;
            if (selectedStatus === 'vendido') {
                const priceCheck = validators.price(priceSold, { min: 1 });
                if (!priceCheck.ok) { setFieldErrors({ price: priceCheck.error }); throw new Error(priceCheck.error); }
                parsedPrice = parseFloat(priceSold);
            }

            return await inventoryService.updateItemStatus({
                itemId: item.id,
                expectedPreviousStatus: item.status,
                newStatus: selectedStatus as ItemStatus,
                priceSold: parsedPrice,
                notes: notes.trim() || undefined,
            });
        },
        onSuccess: (data) => {
            const opt = STATUS_OPTIONS.find(o => o.value === data.new_status);
            toast.success(
                `Prenda #${data.item_id} actualizada`,
                `${opt?.emoji ?? ''} Ahora está ${opt?.label.toLowerCase()}`
            );
            // El canal de realtime ya patcheará la caché, pero refrescamos por si.
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
            onClose();
        },
        onError: (err: unknown) => {
            const msg = parseError(err);
            toast.error('No se pudo actualizar la prenda', msg);
            // Si fue stale, sugerimos refresh implícito
            if (err instanceof Error && err.message.startsWith('STALE_STATE')) {
                queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        mutation.mutate();
    };

    const recommendedPrice = item?.products?.base_price ?? 0;
    const isSold = selectedStatus === 'vendido';
    const priceQuickValues = useMemo(() => {
        if (!recommendedPrice || recommendedPrice <= 0) return [];
        return [
            Math.round(recommendedPrice * 0.9),
            recommendedPrice,
            Math.round(recommendedPrice * 1.1),
        ];
    }, [recommendedPrice]);

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">#{item.id}</span>
                            <span className="truncate">{item.products?.name ?? 'Prenda'}</span>
                        </DialogTitle>
                        <DialogDescription>
                            {item.products?.brands?.name && <>{item.products.brands.name} · </>}
                            Talla <span className="font-mono uppercase">{item.size}</span> · <span className="capitalize">{item.color}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Estado actual */}
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                            <span className="text-xs uppercase tracking-wider text-gray-500">Estado actual</span>
                            <Badge variant="outline" className="capitalize text-xs">{item.status}</Badge>
                        </div>

                        {/* Picker visual de estado */}
                        <div className="grid gap-2">
                            <Label>Cambiar a *</Label>
                            <StatusPicker
                                value={selectedStatus}
                                onChange={(v) => { setSelectedStatus(v); setFieldErrors(prev => ({ ...prev, status: undefined })); }}
                                currentStatus={item.status}
                                disabled={mutation.isPending}
                            />
                            {fieldErrors.status && (
                                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{fieldErrors.status}</p>
                            )}
                        </div>

                        {/* Precio cobrado (solo si vendido) */}
                        {isSold && (
                            <div className="grid gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label htmlFor="priceSold" className="text-indigo-900 flex items-center gap-1.5">
                                    <CircleDollarSign className="h-4 w-4" />
                                    Precio cobrado *
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-indigo-700">$</span>
                                    <Input
                                        id="priceSold"
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={priceSold}
                                        onChange={(e) => { setPriceSold(e.target.value); setFieldErrors(prev => ({ ...prev, price: undefined })); }}
                                        className="pl-7 bg-white h-11 text-base tabular-nums sm:h-9 sm:text-sm"
                                        autoFocus
                                    />
                                </div>
                                {priceQuickValues.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap">
                                        <span className="text-[10px] uppercase tracking-wider text-indigo-700/70 self-center">Sugerido:</span>
                                        {priceQuickValues.map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setPriceSold(String(v))}
                                                className="px-2 py-0.5 text-xs rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors tabular-nums"
                                            >
                                                {currencyFmt.format(v)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {fieldErrors.price && (
                                    <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{fieldErrors.price}</p>
                                )}
                            </div>
                        )}

                        {/* Notas */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="flex items-center gap-1.5 text-gray-700">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Notas <span className="text-gray-400 font-normal">(opcional)</span>
                            </Label>
                            <Input
                                id="notes"
                                placeholder="Ej. Entregado a Juan en sucursal centro"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={200}
                                className="h-11 text-base sm:h-9 sm:text-sm"
                            />
                            <p className="text-[10px] text-gray-400 self-end tabular-nums">{notes.length}/200</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={mutation.isPending}
                            className="h-11 sm:h-8"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || !selectedStatus}
                            className="h-11 sm:h-8 min-w-[140px]"
                        >
                            {mutation.isPending ? 'Procesando…' : 'Confirmar cambio'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
