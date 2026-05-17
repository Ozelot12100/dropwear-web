import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventory';
import { catalogService } from '../../services/catalogs';
import { useAuth, useToast } from '../../hooks';
import { parseError } from '../../lib/errors';
import { validators, VALID_SIZES } from '../../lib/validation';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertTriangle, Search } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function AddItemModal({ isOpen, onClose }: Props) {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [productId, setProductId] = useState<string>('');
    const [productSearch, setProductSearch] = useState<string>('');
    const [size, setSize] = useState<string>('');
    const [color, setColor] = useState<string>('');
    const [errors, setErrors] = useState<{ product?: string; size?: string; color?: string }>({});

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: catalogService.getProducts,
        enabled: isOpen,
    });

    useEffect(() => {
        if (!isOpen) return;
        setProductId('');
        setProductSearch('');
        setSize('');
        setColor('');
        setErrors({});
    }, [isOpen]);

    const selectedProduct = useMemo(
        () => products?.find(p => p.id === Number(productId)) ?? null,
        [products, productId]
    );

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!productSearch.trim()) return products;
        const q = productSearch.trim().toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.brands?.name?.toLowerCase().includes(q) ?? false) ||
            (p.categories?.name?.toLowerCase().includes(q) ?? false)
        );
    }, [products, productSearch]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('NO_AUTH:');

            const p = validators.id(productId, 'el producto');
            const s = validators.size(size);
            const c = validators.color(color);

            if (!p.ok || !s.ok || !c.ok) {
                setErrors({ product: p.error, size: s.error, color: c.error });
                throw new Error('VALIDATION:');
            }

            return await inventoryService.addItem({
                productId: Number(productId),
                size,
                color,
            });
        },
        onSuccess: (data) => {
            toast.success(`Prenda #${data.item_id} agregada`, 'Disponible en inventario.');
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            onClose();
        },
        onError: (err: unknown) => {
            if (err instanceof Error && err.message === 'VALIDATION:') return; // ya pintamos los field errors
            toast.error('No se pudo agregar la prenda', parseError(err));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        mutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Agregar nueva prenda</DialogTitle>
                        <DialogDescription>
                            El artículo se registrará automáticamente como <strong className="text-emerald-700">disponible</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Selector con buscador inline */}
                        <div className="grid gap-2">
                            <Label htmlFor="product-search">Producto del catálogo *</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                    id="product-search"
                                    type="search"
                                    placeholder="Buscar por nombre, marca, categoría…"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    className="pl-9 h-11 text-base sm:h-9 sm:text-sm"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                                {loadingProducts && (
                                    <p className="px-3 py-2 text-sm text-gray-400">Cargando catálogo…</p>
                                )}
                                {!loadingProducts && filteredProducts.length === 0 && (
                                    <p className="px-3 py-3 text-sm text-gray-400">Sin productos para esa búsqueda.</p>
                                )}
                                {!loadingProducts && filteredProducts.map(p => {
                                    const active = String(p.id) === productId;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => { setProductId(String(p.id)); setErrors(prev => ({ ...prev, product: undefined })); }}
                                            className={`w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 transition-colors ${
                                                active ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className={`text-sm truncate ${active ? 'font-semibold text-indigo-900' : 'font-medium text-gray-900'}`}>{p.name}</p>
                                                    <p className="text-[11px] text-gray-500">
                                                        {p.brands?.name ?? '—'} · {p.categories?.name ?? '—'}
                                                    </p>
                                                </div>
                                                <span className={`text-sm font-bold tabular-nums shrink-0 ${active ? 'text-indigo-700' : 'text-gray-700'}`}>
                                                    ${p.base_price}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.product && (
                                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.product}</p>
                            )}
                            {selectedProduct && (
                                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                    Seleccionado: <strong>{selectedProduct.name}</strong> · ${selectedProduct.base_price}
                                </p>
                            )}
                        </div>

                        {/* Talla: pills */}
                        <div className="grid gap-2">
                            <Label>Talla *</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_SIZES.map(s => {
                                    const active = size === s;
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => { setSize(s); setErrors(prev => ({ ...prev, size: undefined })); }}
                                            className={`min-w-[44px] h-10 px-3 rounded-lg text-sm font-mono font-semibold transition-all ${
                                                active
                                                    ? 'bg-gray-900 text-white shadow-sm scale-105'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.size && (
                                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.size}</p>
                            )}
                        </div>

                        {/* Color */}
                        <div className="grid gap-2">
                            <Label htmlFor="color">Color *</Label>
                            <Input
                                id="color"
                                type="text"
                                placeholder="Ej. Negro, Azul rey, Rojo vino"
                                value={color}
                                onChange={(e) => { setColor(e.target.value); setErrors(prev => ({ ...prev, color: undefined })); }}
                                maxLength={30}
                                className="h-11 text-base sm:h-9 sm:text-sm capitalize"
                                autoComplete="off"
                            />
                            {errors.color && (
                                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.color}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onClose()}
                            disabled={mutation.isPending}
                            className="h-11 sm:h-8"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || loadingProducts || !productId || !size || !color.trim()}
                            className="h-11 sm:h-8 min-w-[160px]"
                        >
                            {mutation.isPending ? 'Guardando…' : 'Agregar al inventario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
