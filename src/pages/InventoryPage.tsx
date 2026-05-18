import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventory';
import type { InventoryItemWithRelations, ItemStatus } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { TransactionModal } from '../components/inventory/TransactionModal';
import { AddItemModal } from '../components/inventory/AddItemModal';
import { EditItemModal } from '../components/inventory/EditItemModal';
import { RoleGuard } from '../components/layout/RoleGuard';
import { Plus, ChevronRight, Search, X, Edit2, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

// ── Colores por estado ────────────────────────────────────────────────────────
const statusColorMap: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800 hover:bg-green-100',
    apartado: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    vendido: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    devuelto: 'bg-red-100 text-red-800 hover:bg-red-100',
};

// Indicador de color del borde izquierdo de la tarjeta según estado
const statusBorderMap: Record<string, string> = {
    disponible: 'border-l-green-400',
    apartado: 'border-l-yellow-400',
    vendido: 'border-l-indigo-400',
    devuelto: 'border-l-red-400',
};

// ── Filtros disponibles ───────────────────────────────────────────────────────
const STATUS_FILTERS: { label: string; value: ItemStatus | 'todos' }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Disponible', value: 'disponible' },
    { label: 'Apartado', value: 'apartado' },
    { label: 'Vendido', value: 'vendido' },
    { label: 'Devuelto', value: 'devuelto' },
];

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
    return (
        <div className={`w-full bg-white border border-l-4 ${statusBorderMap[item.status] ?? 'border-l-gray-200'} rounded-lg p-4 flex items-center justify-between shadow-sm transition-transform relative`}>
            {/* Contenedor del contenido clicable para la transacción */}
            <button
                onClick={onPress}
                className="flex-1 min-w-0 text-left active:scale-[0.98]"
            >
                {/* Línea 1: Producto + marca */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate">{item.products?.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.products?.brands?.name}</span>
                </div>

                {/* Línea 2: Talla + color + estado */}
                <div className="flex items-center gap-2 flex-wrap pr-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono uppercase">
                        {item.size}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.color}</span>
                    <Badge className={`text-[10px] h-5 ${statusColorMap[item.status] ?? 'bg-gray-100'}`}>
                        {item.status.toUpperCase()}
                    </Badge>
                </div>
            </button>

            {/* Acciones laterales: Editar + Precio y Flecha */}
            <div className="flex items-center gap-3 ml-2 shrink-0">
                <button
                    onClick={onEdit}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-full transition-colors active:scale-95"
                    aria-label="Editar"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={onPress} className="flex items-center gap-2 active:scale-95">
                    <span className={`text-sm font-bold ${item.status === 'vendido' ? 'text-green-700' : 'text-gray-700'}`}>
                        ${item.status === 'vendido' ? item.price_sold : item.products?.base_price}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
            </div>
        </div>
    );
}

// ── Skeletons de carga ────────────────────────────────────────────────────────
function MobileSkeletons() {
    return (
        <div className="sm:hidden space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-l-4 border-l-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-4 w-10 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
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
                    {Array.from({ length: 7 }).map((_, j) => (
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
    }, [items, statusFilter, searchQuery]);

    // Contadores por estado (para las pills de filtro)
    const counts = items?.reduce<Record<string, number>>((acc, i) => {
        acc[i.status] = (acc[i.status] ?? 0) + 1;
        return acc;
    }, {}) ?? {};

    if (isError) return (
        <div className="flex items-center justify-center h-48 text-red-500">
            Error al cargar el inventario.
        </div>
    );

    return (
        <div className="space-y-4">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        Inventario
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500">
                        {isLoading ? (
                            <Skeleton className="h-3 w-28 mt-1" />
                        ) : (
                            <>{items?.length ?? 0} prendas · tiempo real</>
                        )}
                    </p>
                </div>
                <RoleGuard allowed={['socio', 'superadmin']}>
                    <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Agregar Prenda</span>
                        <span className="sm:hidden">Agregar</span>
                    </Button>
                </RoleGuard>
            </div>

            {/* ── Búsqueda y Filtros ─────────────────────────────────────────── */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                        type="search"
                        placeholder="Buscar por producto, marca, talla o color..."
                        value={searchRaw}
                        onChange={e => setSearchRaw(e.target.value)}
                        className="pl-9 pr-9 h-11 text-base sm:text-sm sm:h-9"
                        autoComplete="off"
                    />
                    {searchRaw && (
                        <button
                            onClick={() => setSearchRaw('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <Sheet>
                    <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 sm:h-9 px-3 shrink-0 relative">
                        <Filter className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Filtros Avanzados</SheetTitle>
                            <SheetDescription>
                                Refina tu búsqueda en el inventario actual.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label>Marca</Label>
                                <Select
                                    value={advancedFilters.brand}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, brand: val || 'todas' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las marcas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">Todas las marcas</SelectItem>
                                        {dynamicOptions.brands.map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select
                                    value={advancedFilters.category}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, category: val || 'todas' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las categorías" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">Todas las categorías</SelectItem>
                                        {dynamicOptions.categories.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Talla</Label>
                                <Select
                                    value={advancedFilters.size}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, size: val || 'todas' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las tallas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">Todas las tallas</SelectItem>
                                        {dynamicOptions.sizes.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <SheetFooter className="mt-8 gap-2 sm:gap-0">
                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setAdvancedFilters({ brand: 'todas', category: 'todas', size: 'todas' })}
                                >
                                    Limpiar
                                </Button>
                            )}
                            <SheetClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto">
                                Aplicar Filtros
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Filtros de estado (pills horizontales con scroll) ──── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {STATUS_FILTERS.map(({ label, value }) => {
                    const count = value === 'todos' ? (items?.length ?? 0) : (counts[value] ?? 0);
                    const isActive = statusFilter === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setStatusFilter(value)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${isActive
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            {label}
                            <span className={`text-[10px] ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Contador de resultados cuando hay búsqueda activa */}
            {searchQuery && (
                <p className="text-xs text-gray-500 -mt-2">
                    {filtered.length === 0
                        ? 'Sin resultados para esa búsqueda.'
                        : `${filtered.length} prenda${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`
                    }
                </p>
            )}

            {/* ── Vista MÓVIL: skeleton o tarjetas ──────────────── */}
            {isLoading ? <MobileSkeletons /> : (
                <div className="sm:hidden space-y-2">
                    {filtered.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onPress={() => openItem(item)}
                            onEdit={() => openEditItem(item)}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            {searchQuery ? `Sin resultados para "${searchRaw}"` : 'No hay prendas con ese estatus.'}
                        </div>
                    )}
                </div>
            )}

            {/* ── Vista DESKTOP: skeleton o tabla ──────────────────── */}
            <Card className="hidden sm:block">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Listado de Prendas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Talla</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Estatus</TableHead>
                                    <TableHead className="text-right">Precio Base / Venta</TableHead>                                      <TableHead className="w-[60px]"></TableHead>                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Skeleton mientras carga */}
                                {isLoading && <TableSkeletons />}

                                {/* Datos */}
                                {!isLoading && filtered.map((item: InventoryItemWithRelations) => (
                                    <TableRow
                                        key={item.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => openItem(item)}
                                    >
                                        <TableCell className="font-medium text-gray-400">#{item.id}</TableCell>
                                        <TableCell className="font-medium">{item.products?.name}</TableCell>
                                        <TableCell>{item.products?.brands?.name}</TableCell>
                                        <TableCell className="uppercase">{item.size}</TableCell>
                                        <TableCell className="capitalize">{item.color}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColorMap[item.status] ?? 'bg-gray-100 text-gray-800'}>
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.status === 'vendido'
                                                ? <span className="font-bold text-green-700">${item.price_sold}</span>
                                                : <span className="text-gray-600">${item.products?.base_price}</span>
                                            }
                                        </TableCell>                                          <TableCell className="text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditItem(item);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-full transition-colors active:scale-95"
                                                aria-label="Editar"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        </TableCell>                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-gray-400">
                                            {searchQuery ? `Sin resultados para "${searchRaw}"` : 'No hay artículos con ese estatus.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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