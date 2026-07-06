import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { inventoryService } from '../../services/inventory';
import { useAuth } from '../../hooks';
import type { ItemStatus, PaymentMethod, InventoryItemWithRelations } from '../../types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const MAX_NOTES_LENGTH = 200;

// Metadatos de estatus (diseño Stitch): punto + tinte por estado
const STATUS_META: Record<string, { label: string; dot: string; text: string; chip: string }> = {
    disponible: { label: 'Disponible', dot: 'bg-status-available', text: 'text-status-available', chip: 'bg-status-available/10' },
    apartado: { label: 'Apartado', dot: 'bg-status-reserved', text: 'text-status-reserved', chip: 'bg-status-reserved/10' },
    vendido: { label: 'Vendido', dot: 'bg-status-sold', text: 'text-status-sold', chip: 'bg-status-sold/10' },
    devuelto: { label: 'Devuelto', dot: 'bg-status-returned', text: 'text-status-returned', chip: 'bg-status-returned/10' },
};

const STATUS_OPTIONS: ItemStatus[] = ['disponible', 'apartado', 'vendido', 'devuelto'];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'tarjeta', label: 'Tarjeta' },
];

const formatCurrency = (amount: number | null | undefined) =>
    amount == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

// Fecha de hoy YYYY-MM-DD (local) para topes de fechas.
const todayISODate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface TransactionModalProps {
    item: InventoryItemWithRelations | null;
    isOpen: boolean;
    onClose: () => void;
    // Estatus preseleccionado al abrir (usado por los atajos de swipe en el inventario).
    initialStatus?: ItemStatus;
}

export function TransactionModal({ item, isOpen, onClose, initialStatus }: TransactionModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedStatus, setSelectedStatus] = useState<ItemStatus | ''>('');
    const [priceSold, setPriceSold] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Datos del cliente para apartados
    const [reservedFor, setReservedFor] = useState('');
    const [reservedContact, setReservedContact] = useState('');
    const [reservedUntil, setReservedUntil] = useState('');
    const [reservedDeposit, setReservedDeposit] = useState('');

    // Método de pago (para ventas)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');

    // Inicializar el estado de venta cuando se abre un ítem
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedStatus('');
            setPriceSold('');
            setNotes('');
            setError(null);
            setReservedFor('');
            setReservedContact('');
            setReservedUntil('');
            setReservedDeposit('');
            setPaymentMethod('efectivo');
            onClose();
        }
    };

    // Al elegir "Apartado", sugiere una fecha de vencimiento por defecto (+7 días).
    const handleSelectStatus = (value: ItemStatus) => {
        setSelectedStatus(value);
        if (value === 'apartado' && !reservedUntil) {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            setReservedUntil(d.toISOString().slice(0, 10));
        }
    };

    // Atajo de swipe: al abrir con un estatus objetivo, lo preselecciona (si es
    // distinto al actual) para saltar directo a la acción. Se ejecuta solo al abrir.
    useEffect(() => {
        if (isOpen && initialStatus && item && initialStatus !== item.status) {
            handleSelectStatus(initialStatus);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialStatus, item?.id]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Usuario no autenticado');
            if (!selectedStatus) throw new Error('Selecciona un nuevo estatus');

            // 1. "Despertador" Estricto: Forzar a Supabase a despertar su lock de sesión local
            await supabase.auth.getSession();

            // No permitir cambiar al mismo estatus actual
            if (item && selectedStatus === item.status) {
                throw new Error(`El artículo ya tiene el estatus "${selectedStatus}". Selecciona uno diferente.`);
            }

            // 2. Control anti-comas para teclados nativos móviles
            const safePriceSold = priceSold.replace(/,/g, '.');
            const parsedPrice = selectedStatus === 'vendido' ? parseFloat(safePriceSold) : null;
            if (selectedStatus === 'vendido' && (isNaN(parsedPrice!) || parsedPrice! <= 0)) {
                throw new Error('Ingresa un precio de venta válido (mayor a $0).');
            }

            if (notes.length > MAX_NOTES_LENGTH) {
                throw new Error(`Las notas no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`);
            }

            // Validaciones de apartado
            let parsedDeposit: number | null = null;
            if (selectedStatus === 'apartado') {
                if (reservedFor.trim().length < 3) {
                    throw new Error('Captura el nombre del cliente (mín. 3 letras) para apartar.');
                }
                if (!reservedUntil) {
                    throw new Error('Selecciona la fecha de vencimiento del apartado.');
                }
                if (reservedUntil < todayISODate()) {
                    throw new Error('La fecha de vencimiento no puede ser anterior a hoy.');
                }
                if (reservedDeposit.trim()) {
                    parsedDeposit = parseFloat(reservedDeposit.replace(/,/g, '.'));
                    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
                        throw new Error('El anticipo debe ser un monto válido (0 o mayor).');
                    }
                    const basePrice = item?.products?.base_price;
                    if (basePrice != null && parsedDeposit > basePrice) {
                        throw new Error(`El anticipo (${formatCurrency(parsedDeposit)}) no puede ser mayor al precio de la prenda (${formatCurrency(basePrice)}).`);
                    }
                }
            }

            if (!item) throw new Error('No hay prenda seleccionada.');

            // 3. Bomba de tiempo (Timeout) de 15 segundos
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("La operación tardó demasiado en responder (15s). Verifica tu conexión o recarga la página.")), 15000)
            );

            const updatePromise = inventoryService.updateItemStatus({
                itemId: item.id,
                newStatus: selectedStatus as ItemStatus,
                priceSold: parsedPrice,
                notes: notes.trim() || undefined,
                reservedFor: reservedFor,
                reservedContact: reservedContact,
                reservedUntil: reservedUntil,
                reservedDeposit: parsedDeposit,
                paymentMethod: selectedStatus === 'vendido' ? paymentMethod : undefined,
            });

            await Promise.race([updatePromise, timeoutPromise]);
        },
        onSuccess: () => {
            // Forzar recarga de los datos en background
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            handleOpenChange(false);
        },
        onError: (err: Error) => {
            setError(err.message || 'Ocurrió un error en la transacción.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
    };

    if (!item) return null;

    const currentMeta = STATUS_META[item.status];

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            Actualizar Artículo <span className="font-mono">#{item.id}</span>
                        </DialogTitle>
                        <DialogDescription>
                            {item.products?.name} · {item.products?.brands?.name} (Talla: {item.size.toUpperCase()})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        {/* Estatus actual */}
                        <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Estatus actual
                            </Label>
                            {currentMeta && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${currentMeta.chip} ${currentMeta.text}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${currentMeta.dot}`} />
                                    {currentMeta.label}
                                </span>
                            )}
                        </div>

                        {/* Nuevo estatus — rejilla 2×2 */}
                        <div className="grid gap-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Nuevo estatus
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {STATUS_OPTIONS.map((value) => {
                                    const meta = STATUS_META[value]!;
                                    const isCurrent = item.status === value;
                                    const isSelected = selectedStatus === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            disabled={isCurrent}
                                            onClick={() => handleSelectStatus(value)}
                                            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all ${isSelected
                                                ? 'border-ink bg-secondary ring-1 ring-ink'
                                                : 'border-hairline bg-card hover:bg-secondary'
                                                } ${isCurrent ? 'cursor-not-allowed opacity-40' : 'active:scale-[0.98]'}`}
                                        >
                                            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                                            <span className="text-sm font-medium text-ink">{meta.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Datos del cliente si se marca como Apartado */}
                        {selectedStatus === 'apartado' && (
                            <div className="grid gap-3 rounded-xl border border-hairline bg-secondary p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Datos del apartado
                                </p>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="reservedFor" className="text-sm font-medium text-ink">Cliente *</Label>
                                    <Input
                                        id="reservedFor"
                                        placeholder="Nombre de quien aparta"
                                        value={reservedFor}
                                        onChange={(e) => setReservedFor(e.target.value)}
                                        className="bg-card"
                                        maxLength={80}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="reservedContact" className="text-sm font-medium text-ink">Teléfono</Label>
                                        <Input
                                            id="reservedContact"
                                            type="tel"
                                            inputMode="tel"
                                            placeholder="Opcional"
                                            value={reservedContact}
                                            onChange={(e) => setReservedContact(e.target.value)}
                                            className="bg-card font-mono"
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="reservedUntil" className="text-sm font-medium text-ink">Vence *</Label>
                                        <Input
                                            id="reservedUntil"
                                            type="date"
                                            value={reservedUntil}
                                            onChange={(e) => setReservedUntil(e.target.value)}
                                            className="bg-card"
                                            min={todayISODate()}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="reservedDeposit" className="text-sm font-medium text-ink">
                                        Anticipo <span className="font-normal text-muted-foreground">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="reservedDeposit"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Ej. 200.00"
                                        value={reservedDeposit}
                                        onChange={(e) => setReservedDeposit(e.target.value)}
                                        className="bg-card font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Condición crítica: exigir cobro si se marca como Vendido */}
                        {selectedStatus === 'vendido' && (
                            <div className="grid gap-2 rounded-xl border border-hairline bg-secondary p-3">
                                <Label htmlFor="priceSold" className="text-sm font-medium text-ink">
                                    Precio cobrado{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (sugerido: {formatCurrency(item.products?.base_price)})
                                    </span>
                                </Label>
                                <Input
                                    id="priceSold"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Ej. 250.00"
                                    value={priceSold}
                                    onChange={(e) => setPriceSold(e.target.value)}
                                    className="bg-card font-mono"
                                    required
                                    autoFocus
                                />
                                {/* Método de pago (alimenta el Corte de Caja) */}
                                <Label className="mt-1 text-sm font-medium text-ink">Método de pago</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_METHODS.map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPaymentMethod(value)}
                                            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${
                                                paymentMethod === value
                                                    ? 'border-ink bg-ink text-white'
                                                    : 'border-hairline bg-card text-muted-foreground hover:bg-secondary'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Notas / comentarios <span className="font-normal normal-case tracking-normal">(opcional)</span>
                            </Label>
                            <textarea
                                id="notes"
                                rows={2}
                                placeholder="Ej. Entregado a Juan Pérez en Punto X"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                                maxLength={MAX_NOTES_LENGTH}
                                className="flex w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                            />
                            <p className={`text-right text-xs ${notes.length >= MAX_NOTES_LENGTH ? 'text-status-returned' : 'text-muted-foreground'}`}>
                                {notes.length}/{MAX_NOTES_LENGTH}
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-status-returned/30 bg-status-returned/10 p-3 text-sm text-status-returned">
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={mutation.isPending || !selectedStatus}>
                            {mutation.isPending ? 'Procesando...' : 'Confirmar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
