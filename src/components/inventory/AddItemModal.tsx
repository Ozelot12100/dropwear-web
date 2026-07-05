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

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICA'];
const COLOR_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;

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
            <DialogContent className="sm:max-w-[460px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Agregar Nueva Prenda al Inventario</DialogTitle>
                        <DialogDescription>
                            El artículo se registrará como <strong>disponible</strong> de forma inmediata.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Selector de Producto */}
                        <div className="grid gap-2">
                            <Label htmlFor="product">Producto del Catálogo *</Label>
                            <select
                                id="product"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                <p className="text-xs text-muted-foreground">
                                    Categoría: {selectedProduct.categories?.name}
                                    {selectedProduct.description && ` · ${selectedProduct.description}`}
                                </p>
                            )}
                        </div>

                        {/* Selector de Talla */}
                        <div className="grid gap-2">
                            <Label htmlFor="size">Talla *</Label>
                            <select
                                id="size"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                required
                            >
                                <option value="" disabled>Selecciona una talla...</option>
                                {SIZES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Input de Color */}
                        <div className="grid gap-2">
                            <Label htmlFor="color">
                                Color * <span className="text-xs text-muted-foreground font-normal">(solo letras, mín. 3)</span>
                            </Label>
                            <Input
                                id="color"
                                type="text"
                                placeholder="ej. Negro, Azul Rey, Rojo Vino"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                required
                                maxLength={30}
                            />
                            <p className="text-xs text-muted-foreground text-right">{color.length}/30</p>
                        </div>

                        {/* Bloque de error */}
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
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
