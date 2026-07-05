import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventory';
import type { InventoryItemWithRelations, ItemStatus } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { TransactionModal } from '../components/inventory/TransactionModal';
import { AddItemModal } from '../components/inventory/AddItemModal';
import { EditItemModal } from '../components/inventory/EditItemModal';
import { RoleGuard } from '../components/layout/RoleGuard';
import { Plus, ChevronRight, Search, X, Edit2, SlidersHorizontal, Tag, Layers, Ruler, Shirt } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

// ── Sistema de estatus (diseño Stitch): punto + etiqueta / pill con tinte ──────
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; chip: string }> = {
    disponible: { label: 'Disponible', dot: 'bg-status-available', text: 'text-status-available', chip: 'bg-status-available/10' },
    apartado: { label: 'Apartado', dot: 'bg-status-reserved', text: 'text-status-reserved', chip: 'bg-status-reserved/10' },
    vendido: { label: 'Vendido', dot: 'bg-status-sold', text: 'text-status-sold', chip: 'bg-status-sold/10' },
    devuelto: { label: 'Devuelto', dot: 'bg-status-returned', text: 'text-status-returned', chip: 'bg-status-returned/10' },
};

const fallbackStatus = { label: 'Desconocido', dot: 'bg-muted-foreground', text: 'text-muted-foreground', chip: 'bg-secondary' };

const formatCurrency = (amount: number | null | undefined) =>
    amount == null
        ? '—'
        : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

// ── Filtros de estado ─────────────────────────────────────────────────────────
const STATUS_FILTERS: { label: string; value: ItemStatus | 'todos' }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Disponible', value: 'disponible' },
    { label: 'Apartado', value: 'apartado' },
    { label: 'Vendido', value: 'vendido' },
    { label: 'Devuelto', value: 'devuelto' },
];

// ── Etiqueta de estatus reutilizable (punto + texto) ──────────────────────────
function StatusLabel({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? fallbackStatus;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Chip de estatus tipo pill (tabla escritorio) ──────────────────────────────
function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? fallbackStatus;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.chip} ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Chip de talla en mono ─────────────────────────────────────────────────────
function SizeChip({ size }: { size: string }) {
    return (
        <span className="inline-flex items-center rounded-md border border-hairline bg-secondary px-2 py-0.5 font-mono text-xs uppercase text-ink">
            {size}
        </span>
    );
}

// ── Tarjeta de ítem para móvil ───────────────────────────────────────────────
function ItemCard({
    item,
    onPress,
    onEdit,
}: {
    item: InventoryItemWithRelations;
    onPress: () => void;
    onEdit: () => void;
}) {
    const price = item.status === 'vendido' ? item.price_sold : item.products?.base_price;
    return (
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card p-3 shadow-soft">
            {/* Miniatura (placeholder hasta que se agreguen fotos) */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Shirt className="h-6 w-6" />
            </div>

            {/* Contenido clicable → transacción */}
            <button onClick={onPress} className="flex min-w-0 flex-1 flex-col gap-1.5 text-left active:scale-[0.99]">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.products?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.products?.brands?.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SizeChip size={item.size} />
                    <span className="text-xs capitalize text-muted-foreground">{item.color}</span>
                    <StatusLabel status={item.status} />
                </div>
            </button>

            {/* Precio + acciones */}
            <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`font-mono text-sm font-semibold ${item.status === 'vendido' ? 'text-status-available' : 'text-ink'}`}>
                    {formatCurrency(price)}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                        aria-label="Editar"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={onPress} className="text-muted-foreground active:scale-95" aria-label="Ver detalle">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Skeletons de carga ────────────────────────────────────────────────────────
function MobileSkeletons() {
    return (
        <div className="space-y-3 sm:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-hairline bg-card p-3">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                        <div className="flex gap-2">
                            <Skeleton className="h-4 w-10 rounded" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    );
}

function TableSkeletons() {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function InventoryPage() {
    const queryClient = useQueryClient();
    const [selectedItem, setSelectedItem] = useState<InventoryItemWithRelations | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ItemStatus | 'todos'>('todos');
    const [searchRaw, setSearchRaw] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState({
        brand: 'todas',
        category: 'todas',
        size: 'todas'
    });

    // Contador de filtros activos
    const activeFiltersCount = (advancedFilters.brand !== 'todas' ? 1 : 0) +
        (advancedFilters.category !== 'todas' ? 1 : 0) +
        (advancedFilters.size !== 'todas' ? 1 : 0);

    // Debounce: espera 250ms tras el último keystroke antes de filtrar
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchRaw.trim().toLowerCase()), 250);
        return () => clearTimeout(timer);
    }, [searchRaw]);

    // React Query: fetching, loading state y caching
    const { data: items, isLoading, isError } = useQuery({
        queryKey: ['inventory_items'],
        queryFn: inventoryService.getAllItems,
    });

    // Supabase Realtime: invalida caché ante cualquier cambio en inventory_items
    useEffect(() => {
        const channel = supabase
            .channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
                queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);

    const openItem = (item: InventoryItemWithRelations) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const openEditItem = (item: InventoryItemWithRelations) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };

    // Opciones dinámicas para los filtros (se extraen de los items disponibles)
    const dynamicOptions = useMemo(() => {
        if (!items) return { brands: [], categories: [], sizes: [] };
        const b = new Set<string>();
        const c = new Set<string>();
        const s = new Set<string>();

        items.forEach(i => {
            if (i.products?.brands?.name) b.add(i.products.brands.name);
            if (i.products?.categories?.name) c.add(i.products.categories.name);
            if (i.size) s.add(i.size.toUpperCase());
        });

        return {
            brands: Array.from(b).sort(),
            categories: Array.from(c).sort(),
            sizes: Array.from(s).sort()
        };
    }, [items]);

    // Filtro combinado: estado + búsqueda de texto + avanzados
    // useMemo evita recalcular en renders que no cambian los datos o los filtros
    const filtered = useMemo((): InventoryItemWithRelations[] => {
        let result: InventoryItemWithRelations[] = items ?? [];

        // 1. Filtro por estado
        if (statusFilter !== 'todos') {
            result = result.filter(i => i.status === statusFilter);
        }

        // 2. Filtros Avanzados
        if (advancedFilters.brand !== 'todas') {
            result = result.filter(i => i.products?.brands?.name === advancedFilters.brand);
        }
        if (advancedFilters.category !== 'todas') {
            result = result.filter(i => i.products?.categories?.name === advancedFilters.category);
        }
        if (advancedFilters.size !== 'todas') {
            result = result.filter(i => i.size.toUpperCase() === advancedFilters.size);
        }

        // 3. Filtro por texto (producto, marca, color, talla)
        if (searchQuery) {
            result = result.filter(i => {
                const name = i.products?.name?.toLowerCase() ?? '';
                const brand = i.products?.brands?.name?.toLowerCase() ?? '';
                const color = i.color.toLowerCase();
                const size = i.size.toLowerCase();
                return (
                    name.includes(searchQuery) ||
                    brand.includes(searchQuery) ||
                    color.includes(searchQuery) ||
                    size.includes(searchQuery)
                );
            });
        }

        return result;
    }, [items, statusFilter, searchQuery, advancedFilters]);

    // Contadores por estado (para las pills de filtro)
    const counts = items?.reduce<Record<string, number>>((acc, i) => {
        acc[i.status] = (acc[i.status] ?? 0) + 1;
        return acc;
    }, {}) ?? {};

    if (isError) return (
        <div className="flex h-48 items-center justify-center text-status-returned">
            Error al cargar el inventario.
        </div>
    );

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
                        Inventario
                    </h1>
                    <div className="mt-1 text-sm text-muted-foreground">
                        {isLoading ? (
                            <Skeleton className="h-3 w-28" />
                        ) : (
                            <>{items?.length ?? 0} prendas · tiempo real</>
                        )}
                    </div>
                </div>
                <RoleGuard allowed={['socio', 'superadmin']}>
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Agregar Prenda</span>
                        <span className="sm:hidden">Agregar</span>
                    </Button>
                </RoleGuard>
            </div>

            {/* ── Búsqueda y Filtros ─────────────────────────────────────────── */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por producto, marca, talla o color..."
                        value={searchRaw}
                        onChange={e => setSearchRaw(e.target.value)}
                        className="h-11 pl-10 pr-10 text-base sm:h-10 sm:text-sm"
                        autoComplete="off"
                    />
                    {searchRaw && (
                        <button
                            onClick={() => setSearchRaw('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-ink"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <Sheet>
                    <SheetTrigger className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-10">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros avanzados</span>
                        {activeFiltersCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-ink text-[10px] font-bold text-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full overflow-y-auto sm:w-[400px]">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="font-heading">Filtros Avanzados</SheetTitle>
                            <SheetDescription>
                                Refina tu búsqueda en el inventario actual.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-2 space-y-8">
                            {/* Grupo Marca */}
                            <div className="space-y-3">
                                <Label className="flex items-center text-sm font-semibold text-ink">
                                    <Tag className="mr-2 h-4 w-4 text-brand" />
                                    Marca
                                </Label>
                                <Select
                                    value={advancedFilters.brand}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, brand: val || 'todas' }))}
                                >
                                    <SelectTrigger className="h-12 w-full border-hairline bg-secondary transition-colors hover:bg-accent">
                                        <SelectValue placeholder="Todas las marcas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas" className="font-medium text-muted-foreground">Todas las marcas</SelectItem>
                                        {dynamicOptions.brands.map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Grupo Categoría */}
                            <div className="space-y-3">
                                <Label className="flex items-center text-sm font-semibold text-ink">
                                    <Layers className="mr-2 h-4 w-4 text-brand" />
                                    Categoría
                                </Label>
                                <Select
                                    value={advancedFilters.category}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, category: val || 'todas' }))}
                                >
                                    <SelectTrigger className="h-12 w-full border-hairline bg-secondary transition-colors hover:bg-accent">
                                        <SelectValue placeholder="Todas las categorías" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas" className="font-medium text-muted-foreground">Todas las categorías</SelectItem>
                                        {dynamicOptions.categories.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Grupo Talla (pills interactivas) */}
                            <div className="space-y-3">
                                <Label className="flex items-center text-sm font-semibold text-ink">
                                    <Ruler className="mr-2 h-4 w-4 text-brand" />
                                    Talla
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setAdvancedFilters(prev => ({ ...prev, size: 'todas' }))}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${advancedFilters.size === 'todas'
                                            ? 'bg-ink text-white'
                                            : 'bg-secondary text-muted-foreground hover:bg-accent'
                                            }`}
                                    >
                                        Todas
                                    </button>
                                    {dynamicOptions.sizes.map(s => {
                                        const isSelected = advancedFilters.size === s;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setAdvancedFilters(prev => ({ ...prev, size: s }))}
                                                className={`rounded-lg px-4 py-2 font-mono text-sm font-bold uppercase transition-all ${isSelected
                                                    ? 'bg-ink text-white'
                                                    : 'border border-hairline bg-card text-ink hover:border-brand/40 hover:bg-secondary'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <SheetFooter className="mt-10 gap-3 sm:gap-2">
                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setAdvancedFilters({ brand: 'todas', category: 'todas', size: 'todas' })}
                                >
                                    Limpiar
                                </Button>
                            )}
                            <SheetClose className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:w-auto">
                                Aplicar Filtros
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Filtros de estado (pills horizontales con scroll) ──── */}
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {STATUS_FILTERS.map(({ label, value }) => {
                    const count = value === 'todos' ? (items?.length ?? 0) : (counts[value] ?? 0);
                    const isActive = statusFilter === value;
                    const dot = value !== 'todos' ? STATUS_CONFIG[value]?.dot : null;
                    return (
                        <button
                            key={value}
                            onClick={() => setStatusFilter(value)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${isActive
                                ? 'border-ink bg-ink text-white'
                                : 'border-hairline bg-card text-muted-foreground hover:border-muted-foreground/40'
                                }`}
                        >
                            {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
                            {label}
                            <span className={`font-mono text-[10px] ${isActive ? 'opacity-70' : 'text-muted-foreground/70'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Contador de resultados cuando hay búsqueda activa */}
            {searchQuery && (
                <p className="-mt-2 text-xs text-muted-foreground">
                    {filtered.length === 0
                        ? 'Sin resultados para esa búsqueda.'
                        : `${filtered.length} prenda${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`
                    }
                </p>
            )}

            {/* ── Vista MÓVIL: skeleton o tarjetas ──────────────── */}
            {isLoading ? <MobileSkeletons /> : (
                <div className="space-y-3 sm:hidden">
                    {filtered.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onPress={() => openItem(item)}
                            onEdit={() => openEditItem(item)}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {searchQuery ? `Sin resultados para "${searchRaw}"` : 'No hay prendas con ese estatus.'}
                        </div>
                    )}
                </div>
            )}

            {/* ── Vista DESKTOP: skeleton o tabla ──────────────────── */}
            <div className="hidden overflow-hidden rounded-xl border border-hairline bg-card shadow-soft sm:block">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className="w-[80px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Marca</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Talla</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Color</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estatus</TableHead>
                            <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Precio Base / Venta</TableHead>
                            <TableHead className="w-[60px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Skeleton mientras carga */}
                        {isLoading && <TableSkeletons />}

                        {/* Datos */}
                        {!isLoading && filtered.map((item: InventoryItemWithRelations) => (
                            <TableRow
                                key={item.id}
                                className="cursor-pointer border-hairline hover:bg-secondary/60"
                                onClick={() => openItem(item)}
                            >
                                <TableCell className="font-mono text-muted-foreground">#{item.id}</TableCell>
                                <TableCell>
                                    <div className="font-semibold text-ink">{item.products?.name}</div>
                                    {item.products?.categories?.name && (
                                        <div className="text-xs text-muted-foreground">{item.products.categories.name}</div>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{item.products?.brands?.name}</TableCell>
                                <TableCell><SizeChip size={item.size} /></TableCell>
                                <TableCell className="capitalize text-ink">{item.color}</TableCell>
                                <TableCell><StatusPill status={item.status} /></TableCell>
                                <TableCell className="text-right">
                                    {item.status === 'vendido'
                                        ? <span className="font-mono font-semibold text-status-available">{formatCurrency(item.price_sold)}</span>
                                        : <span className="font-mono text-ink">{formatCurrency(item.products?.base_price)}</span>
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditItem(item);
                                        }}
                                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                                        aria-label="Editar"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && filtered.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    {searchQuery ? `Sin resultados para "${searchRaw}"` : 'No hay artículos con ese estatus.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {!isLoading && filtered.length > 0 && (
                    <div className="border-t border-hairline px-4 py-3 text-xs text-muted-foreground">
                        Mostrando {filtered.length} de {items?.length ?? 0} prendas
                    </div>
                )}
            </div>

            {/* ── Modales ───────────────────────────────────────────── */}
            <TransactionModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
            <AddItemModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
            <EditItemModal
                item={selectedItem}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
            />
        </div>
    );
}
