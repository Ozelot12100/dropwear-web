import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventory';
import { catalogService } from '../../services/catalogs';
import { useAuth } from '../../hooks';
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
import { Tag, CheckCircle2 } from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICA'];
const COLOR_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;

const selectClass =
    'flex h-11 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const capsLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [productId, setProductId] = useState<string>('');
    const [size, setSize] = useState<string>('');
    const [color, setColor] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Carga la lista de productos del catálogo para el selector
    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: catalogService.getProducts,
        enabled: isOpen, // Solo carga cuando el modal está abierto
    });

    const resetForm = () => {
        setProductId('');
        setSize('');
        setColor('');
        setError(null);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetForm();
            onClose();
        }
    };

    const validateColor = (value: string): string | null => {
        const trimmed = value.trim();
        if (trimmed.length < 3) return 'El color debe tener al menos 3 letras.';
        if (!COLOR_REGEX.test(trimmed)) return 'El color solo puede contener letras y espacios.';
        return null;
    };

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Usuario no autenticado.');
            if (!productId) throw new Error('Selecciona un producto del catálogo.');
            if (!size) throw new Error('Selecciona una talla.');

            const colorError = validateColor(color);
            if (colorError) throw new Error(colorError);

            await inventoryService.addItem({
                productId: Number(productId),
                size,
                color: color.trim(),
            });
        },
        onSuccess: () => {
            // Refrescar el inventario en el Dashboard automáticamente
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            handleOpenChange(false);
        },
        onError: (err: Error) => {
            setError(err.message || 'Error al agregar la prenda.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
    };

    const selectedProduct = products?.find((p) => p.id === Number(productId));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg">Agregar Nueva Prenda</DialogTitle>
                        <DialogDescription>
                            El artículo se registrará como <strong>disponible</strong> de forma inmediata.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        {/* Selector de Producto */}
                        <div className="grid gap-2">
                            <Label htmlFor="product" className={capsLabel}>Producto del catálogo *</Label>
                            <select
                                id="product"
                                className={selectClass}
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                required
                                disabled={loadingProducts}
                            >
                                <option value="" disabled>
                                    {loadingProducts ? 'Cargando catálogo...' : 'Selecciona un producto...'}
                                </option>
                                {products?.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — {p.brands?.name} (${p.base_price})
                                    </option>
                                ))}
                            </select>
                            {selectedProduct && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Tag className="h-3.5 w-3.5 text-brand" />
                                    Categoría: {selectedProduct.categories?.name}
                                    {selectedProduct.description && ` · ${selectedProduct.description}`}
                                </p>
                            )}
                        </div>

                        {/* Selector de Talla (pills) */}
                        <div className="grid gap-2">
                            <Label className={capsLabel}>Talla *</Label>
                            <div className="flex flex-wrap gap-2">
                                {SIZES.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSize(s)}
                                        className={`rounded-lg px-4 py-2 font-mono text-sm font-bold uppercase transition-all active:scale-95 ${size === s
                                            ? 'bg-ink text-white'
                                            : 'bg-secondary text-ink hover:bg-accent'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input de Color */}
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="color" className={capsLabel}>Color *</Label>
                                <span className="font-mono text-xs text-muted-foreground">{color.length}/30</span>
                            </div>
                            <Input
                                id="color"
                                type="text"
                                placeholder="ej. Negro, Azul Rey, Rojo Vino"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                required
                                maxLength={30}
                                className="h-11"
                            />
                            <p className="text-xs italic text-muted-foreground">Solo letras, mín. 3</p>
                        </div>

                        {/* Callout: se registrará como disponible */}
                        <div className="relative overflow-hidden rounded-xl border border-hairline bg-secondary p-4 pl-5">
                            <span className="absolute inset-y-0 left-0 w-1 bg-status-available" />
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-status-available" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-status-available">Disponible</p>
                                    <p className="text-sm text-muted-foreground">Visible en tienda y terminal de ventas.</p>
                                </div>
                            </div>
                        </div>

                        {/* Bloque de error */}
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
                        <Button type="submit" disabled={mutation.isPending || loadingProducts}>
                            {mutation.isPending ? 'Guardando...' : 'Agregar al Inventario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
