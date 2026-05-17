import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { StatCard } from '../components/inventory/StatCard';
import { LiveBadge } from '../components/layout/LiveBadge';
import { RoleGuard } from '../components/layout/RoleGuard';
import { useAuth, useInventoryRealtime, useToast } from '../hooks';
import {
    Plus, ChevronRight, Search, X, Package, CircleDollarSign,
    Bookmark, RotateCcw, Sparkles, AlertCircle, ServerCrash,
} from 'lucide-react';

// ── Mapas de presentación ─────────────────────────────────────────────────────
const statusUI: Record<ItemStatus, { badge: string; border: string; dot: string; label: string }> = {
    disponible: { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',  border: 'border-l-emerald-400', dot: 'bg-emerald-500', label: 'Disponible' },
    apartado:   { badge: 'bg-amber-100 text-amber-700 border border-amber-200',        border: 'border-l-amber-400',   dot: 'bg-amber-500',   label: 'Apartado'   },
    vendido:    { badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',     border: 'border-l-indigo-400',  dot: 'bg-indigo-500',  label: 'Vendido'    },
    devuelto:   { badge: 'bg-rose-100 text-rose-700 border border-rose-200',           border: 'border-l-rose-400',    dot: 'bg-rose-500',    label: 'Devuelto'   },
};

const STATUS_FILTERS: { label: string; value: ItemStatus | 'todos' }[] = [
    { label: 'Todos',       value: 'todos' },
    { label: 'Disponibles', value: 'disponible' },
    { label: 'Apartadas',   value: 'apartado' },
    { label: 'Vendidas',    value: 'vendido' },
    { label: 'Devueltas',   value: 'devuelto' },
];

const isSoldToday = (it: InventoryItemWithRelations) => {
    if (it.status !== 'vendido' || !it.updated_at) return false;
    const d = new Date(it.updated_at);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// ── Tarjeta móvil ────────────────────────────────────────────────────────────
function ItemCard({
    item,
    onPress,
    pulse,
}: {
    item: InventoryItemWithRelations;
    onPress: () => void;
    pulse: boolean;
}) {
    const ui = statusUI[item.status];
    return (
        <button
            onClick={onPress}
            className={`group relative w-full overflow-hidden text-left bg-white border-l-4 ${ui.border} rounded-xl p-4 shadow-sm ring-1 ring-gray-100 active:scale-[0.98] transition-all hover:shadow-md hover:ring-gray-200 ${pulse ? 'animate-pulse-once' : ''}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{item.products?.name ?? '—'}</span>
                        {item.products?.brands?.name && (
                            <span className="text-[10px] text-gray-400 shrink-0 uppercase tracking-wide">
                                · {item.products.brands.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] uppercase bg-gray-900 text-white px-1.5 py-0.5 rounded">
                            {item.size}
                        </span>
                        <span className="text-xs text-gray-500 capitalize truncate">{item.color}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ui.badge}`}>
                            {ui.label}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                        <p className={`text-base font-bold leading-none ${item.status === 'vendido' ? 'text-emerald-600' : 'text-gray-700'}`}>
                            ${item.status === 'vendido' ? item.price_sold : item.products?.base_price ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {item.status === 'vendido' ? 'cobrado' : 'base'}
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </button>
    );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function MobileSkeletons() {
    return (
        <div className="sm:hidden space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-l-4 border-l-gray-200 rounded-xl p-4 space-y-2 ring-1 ring-gray-100">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-4 w-10 rounded" />
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

// ── Página ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const { profile } = useAuth();
    const toast = useToast();
    const { status: rtStatus, lastActivity } = useInventoryRealtime();

    const [selectedItem, setSelectedItem] = useState<InventoryItemWithRelations | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ItemStatus | 'todos'>('todos');
    const [searchRaw, setSearchRaw] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce de búsqueda (250 ms)
    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(searchRaw.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchRaw]);

    const { data: items, isLoading, isError, refetch, error } = useQuery({
        queryKey: ['inventory_items'],
        queryFn: inventoryService.getAllItems,
    });

    // Toast amigable cuando se cae el canal
    useEffect(() => {
        if (rtStatus === 'offline') {
            toast.warning('Conexión en tiempo real perdida', 'Los cambios de otros usuarios no se mostrarán hasta restablecer.');
        }
    }, [rtStatus, toast]);

    const openItem = (item: InventoryItemWithRelations) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    // ── Métricas derivadas (memoizadas) ────────────────────────────────────
    const stats = useMemo(() => {
        const list = items ?? [];
        const counts = { disponible: 0, apartado: 0, vendido: 0, devuelto: 0 } as Record<ItemStatus, number>;
        let salesToday = 0;
        let revenueToday = 0;
        for (const it of list) {
            counts[it.status]++;
            if (isSoldToday(it)) {
                salesToday++;
                revenueToday += Number(it.price_sold ?? 0);
            }
        }
        return { counts, salesToday, revenueToday, total: list.length };
    }, [items]);

    // ── Filtros combinados ────────────────────────────────────────────────
    const filtered = useMemo((): InventoryItemWithRelations[] => {
        let result = items ?? [];
        if (statusFilter !== 'todos') result = result.filter(i => i.status === statusFilter);
        if (searchQuery) {
            result = result.filter(i => {
                const name  = i.products?.name?.toLowerCase() ?? '';
                const brand = i.products?.brands?.name?.toLowerCase() ?? '';
                const color = i.color.toLowerCase();
                const size  = i.size.toLowerCase();
                return name.includes(searchQuery) || brand.includes(searchQuery) || color.includes(searchQuery) || size.includes(searchQuery);
            });
        }
        return result;
    }, [items, statusFilter, searchQuery]);

    // Ítem "recién tocado" — para pulso animado un par de segundos
    const pulseId = useMemo(() => {
        if (!lastActivity) return null;
        if (Date.now() - lastActivity.at > 2500) return null;
        return lastActivity.id;
    }, [lastActivity]);

    if (isError) return (
        <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <ServerCrash className="h-10 w-10 text-rose-500" />
                <h3 className="text-base font-semibold text-gray-900">No pudimos cargar el inventario</h3>
                <p className="text-sm text-gray-500 max-w-md">
                    {error instanceof Error ? error.message : 'Revisa tu conexión a internet y reintenta.'}
                </p>
                <Button onClick={() => refetch()} className="gap-1.5 mt-1"><RotateCcw className="h-4 w-4" />Reintentar</Button>
            </CardContent>
        </Card>
    );

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Buen día';
        if (h < 19) return 'Buena tarde';
        return 'Buena noche';
    })();

    return (
        <div className="space-y-5">
            {/* ── Hero / Header ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden />
                <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />

                <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <LiveBadge status={rtStatus} />
                            <span className="text-[11px] uppercase tracking-widest text-white/60">Operaciones</span>
                        </div>
                        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                            {greeting}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
                        </h1>
                        <p className="mt-1 text-xs text-white/70 sm:text-sm">
                            {isLoading ? 'Cargando inventario...' : `${stats.total} prendas registradas · sincronizadas en vivo`}
                        </p>
                    </div>
                    <RoleGuard allowed={['socio', 'superadmin']}>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            size="sm"
                            className="gap-1.5 bg-white text-gray-900 hover:bg-white/90 shadow-md shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Agregar prenda</span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    </RoleGuard>
                </div>

                {/* KPIs */}
                <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <StatCard label="Total"        value={isLoading ? '—' : stats.total}                  loading={isLoading} accent="slate"   Icon={Package} />
                    <StatCard label="Disponibles"  value={isLoading ? '—' : stats.counts.disponible}      loading={isLoading} accent="emerald" Icon={Sparkles} hint="listas para vender" />
                    <StatCard label="Apartadas"    value={isLoading ? '—' : stats.counts.apartado}        loading={isLoading} accent="amber"   Icon={Bookmark} hint="reservadas" />
                    <StatCard label="Ventas hoy"   value={isLoading ? '—' : `$${stats.revenueToday.toFixed(0)}`} loading={isLoading} accent="indigo"  Icon={CircleDollarSign} hint={`${stats.salesToday} prendas`} />
                </div>
            </div>

            {/* ── Búsqueda + filtros (sticky) ─────────────────────────── */}
            <div className="sticky top-0 z-10 -mx-4 bg-gray-50/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                        type="search"
                        placeholder="Buscar por producto, marca, talla o color…"
                        value={searchRaw}
                        onChange={e => setSearchRaw(e.target.value)}
                        className="pl-9 pr-9 h-11 text-base bg-white sm:text-sm sm:h-9"
                        autoComplete="off"
                    />
                    {searchRaw && (
                        <button
                            onClick={() => setSearchRaw('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            aria-label="Limpiar búsqueda"
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {STATUS_FILTERS.map(({ label, value }) => {
                        const count = value === 'todos' ? (items?.length ?? 0) : (stats.counts[value as ItemStatus] ?? 0);
                        const isActive = statusFilter === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    isActive
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                            >
                                {label}
                                <span className={`tabular-nums text-[10px] ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contador de resultados al buscar */}
            {searchQuery && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {filtered.length === 0
                        ? 'Sin resultados para esa búsqueda.'
                        : `${filtered.length} prenda${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
                </p>
            )}

            {/* ── Vista MÓVIL ──────────────────────────────────────── */}
            {isLoading ? <MobileSkeletons /> : (
                <div className="sm:hidden space-y-2">
                    {filtered.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onPress={() => openItem(item)}
                            pulse={pulseId === item.id}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
                            <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                            <p className="text-sm font-medium text-gray-600">
                                {searchQuery ? `Sin resultados para "${searchRaw}"` : 'No hay prendas con ese estatus.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Vista DESKTOP (tabla) ──────────────────────────────── */}
            <Card className="hidden sm:block">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Listado de prendas</CardTitle>
                    <span className="text-xs text-gray-400 tabular-nums">{filtered.length} resultados</span>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Talla</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Estatus</TableHead>
                                    <TableHead className="text-right">Precio Base / Venta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && <TableSkeletons />}
                                {!isLoading && filtered.map((item) => {
                                    const ui = statusUI[item.status];
                                    const isPulse = pulseId === item.id;
                                    return (
                                        <TableRow
                                            key={item.id}
                                            className={`cursor-pointer hover:bg-gray-50 ${isPulse ? 'bg-amber-50/50 animate-pulse-once' : ''}`}
                                            onClick={() => openItem(item)}
                                        >
                                            <TableCell className="font-mono text-gray-400">#{item.id}</TableCell>
                                            <TableCell className="font-medium">{item.products?.name ?? '—'}</TableCell>
                                            <TableCell className="text-gray-600">{item.products?.brands?.name ?? '—'}</TableCell>
                                            <TableCell className="font-mono uppercase">{item.size}</TableCell>
                                            <TableCell className="capitalize">{item.color}</TableCell>
                                            <TableCell>
                                                <Badge className={ui.badge}>
                                                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${ui.dot}`} />
                                                    {ui.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {item.status === 'vendido'
                                                    ? <span className="font-bold text-emerald-600">${item.price_sold}</span>
                                                    : <span className="text-gray-600">${item.products?.base_price ?? 0}</span>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!isLoading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-gray-400">
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
        </div>
    );
}
