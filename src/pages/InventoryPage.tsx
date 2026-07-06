import { useEffect, useState, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventory';
import type { InventoryItemWithRelations, ItemStatus, PaymentMethod } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { TransactionModal } from '../components/inventory/TransactionModal';
import { AddItemModal } from '../components/inventory/AddItemModal';
import { EditItemModal } from '../components/inventory/EditItemModal';
import { RoleGuard } from '../components/layout/RoleGuard';
import { Plus, ChevronRight, Search, X, Edit2, SlidersHorizontal, Tag, Layers, Ruler, Shirt, Bookmark, Download, ListChecks, Check, RotateCcw, Banknote } from 'lucide-react';
import { downloadCsv, todayStamp } from '../lib/csv';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

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

// ── Apartados: vencimiento ────────────────────────────────────────────────────
const isReservationOverdue = (until: string | null | undefined) => {
    if (!until) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${until}T00:00:00`) < today;
};

const formatReservedDate = (until: string) =>
    new Date(`${until}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

// Línea con los datos del cliente que apartó la prenda (+ resaltado si venció).
function ReservationLine({ item }: { item: InventoryItemWithRelations }) {
    if (item.status !== 'apartado' || !item.reserved_for) return null;
    const overdue = isReservationOverdue(item.reserved_until);
    return (
        <div className={`flex items-center gap-1.5 text-[11px] ${overdue ? 'text-status-returned' : 'text-muted-foreground'}`}>
            <Bookmark className="h-3 w-3 shrink-0" />
            <span className="truncate">
                {item.reserved_for}
                {item.reserved_until ? ` · vence ${formatReservedDate(item.reserved_until)}` : ''}
                {overdue ? ' (vencido)' : ''}
            </span>
        </div>
    );
}

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

// ── Casilla de selección (para modo multi-selección) ──────────────────────────
function SelectBox({ checked }: { checked: boolean }) {
    return (
        <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                checked ? 'border-ink bg-ink text-white' : 'border-hairline bg-card'
            }`}
        >
            {checked && <Check className="h-3.5 w-3.5" />}
        </span>
    );
}

// ── Acciones rápidas de swipe (contextuales por estado) ───────────────────────
type CardAction = { key: string; label: string; icon: LucideIcon; cls: string; run: () => void };

function quickActionsFor(
    status: string,
    onQuickStatus: (s: ItemStatus) => void,
    onEdit: () => void,
): CardAction[] {
    switch (status) {
        case 'disponible':
            return [
                { key: 'apartar', label: 'Apartar', icon: Bookmark, cls: 'bg-status-reserved text-white', run: () => onQuickStatus('apartado') },
                { key: 'vender', label: 'Vender', icon: Banknote, cls: 'bg-status-available text-white', run: () => onQuickStatus('vendido') },
            ];
        case 'apartado':
            return [
                { key: 'liberar', label: 'Liberar', icon: RotateCcw, cls: 'bg-ink text-white', run: () => onQuickStatus('disponible') },
                { key: 'vender', label: 'Vender', icon: Banknote, cls: 'bg-status-available text-white', run: () => onQuickStatus('vendido') },
            ];
        case 'vendido':
            return [
                { key: 'editar', label: 'Editar', icon: Edit2, cls: 'bg-secondary text-ink', run: onEdit },
                { key: 'devolver', label: 'Devolver', icon: RotateCcw, cls: 'bg-status-returned text-white', run: () => onQuickStatus('devuelto') },
            ];
        case 'devuelto':
            return [
                { key: 'editar', label: 'Editar', icon: Edit2, cls: 'bg-secondary text-ink', run: onEdit },
                { key: 'stock', label: 'A stock', icon: Check, cls: 'bg-status-available text-white', run: () => onQuickStatus('disponible') },
            ];
        default:
            return [];
    }
}

const ACTION_W = 76; // ancho por botón revelado (px)

// ── Tarjeta de ítem para móvil (con swipe-to-action) ──────────────────────────
function ItemCard({
    item,
    onPress,
    onEdit,
    onQuickStatus,
    selectMode,
    selected,
    onToggleSelect,
    swipeOpen,
    onSwipeOpenChange,
}: {
    item: InventoryItemWithRelations;
    onPress: () => void;
    onEdit: () => void;
    onQuickStatus: (s: ItemStatus) => void;
    selectMode: boolean;
    selected: boolean;
    onToggleSelect: () => void;
    swipeOpen: boolean;
    onSwipeOpenChange: (open: boolean) => void;
}) {
    const price = item.status === 'vendido' ? item.price_sold : item.products?.base_price;

    const actions = selectMode ? [] : quickActionsFor(item.status, onQuickStatus, onEdit);
    const revealW = actions.length * ACTION_W;

    // ── Mecánica del swipe (pointer events + touch-action: pan-y) ──────────────
    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const startOffset = useRef(0);
    const axis = useRef<'x' | 'y' | null>(null);
    const draggingRef = useRef(false);
    const suppressClick = useRef(false);

    // Cuando el padre cierra esta tarjeta (porque se abrió otra), la regresamos.
    useEffect(() => {
        if (!swipeOpen && !draggingRef.current) setOffset(0);
        if (swipeOpen && !draggingRef.current) setOffset(-revealW);
    }, [swipeOpen, revealW]);

    const swipeEnabled = !selectMode && actions.length > 0;

    const onPointerDown = (e: React.PointerEvent) => {
        if (!swipeEnabled) return;
        startX.current = e.clientX;
        startY.current = e.clientY;
        startOffset.current = offset;
        axis.current = null;
        suppressClick.current = false;
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!swipeEnabled) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (axis.current === null) {
            if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
                axis.current = 'x';
                draggingRef.current = true;
                setDragging(true);
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
            } else if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
                axis.current = 'y'; // gesto vertical → dejar que la lista haga scroll
            }
        }
        if (axis.current === 'x') {
            suppressClick.current = true;
            const next = Math.min(0, Math.max(-revealW, startOffset.current + dx));
            setOffset(next);
        }
    };

    const endDrag = () => {
        if (axis.current === 'x') {
            const open = offset <= -revealW / 2;
            setOffset(open ? -revealW : 0);
            onSwipeOpenChange(open);
        }
        axis.current = null;
        draggingRef.current = false;
        setDragging(false);
    };

    const handleContentClick = () => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        if (offset < -2) { setOffset(0); onSwipeOpenChange(false); return; }
        onPress();
    };

    const content = (
        <>
            <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{item.products?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.products?.brands?.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <SizeChip size={item.size} />
                <span className="text-xs capitalize text-muted-foreground">{item.color}</span>
                <StatusLabel status={item.status} />
            </div>
            <ReservationLine item={item} />
        </>
    );

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Capa de acciones (detrás; se revela al deslizar a la izquierda) */}
            {swipeEnabled && (
                <div className="absolute inset-y-0 right-0 flex" aria-hidden={offset === 0}>
                    {actions.map((a) => {
                        const Icon = a.icon;
                        return (
                            <button
                                key={a.key}
                                type="button"
                                tabIndex={offset === 0 ? -1 : 0}
                                onClick={() => { a.run(); setOffset(0); onSwipeOpenChange(false); }}
                                style={{ width: ACTION_W }}
                                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-opacity active:opacity-80 ${a.cls}`}
                            >
                                <Icon className="h-4 w-4" />
                                {a.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Tarjeta (capa frontal deslizable) */}
            <div
                onClick={selectMode ? onToggleSelect : undefined}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                    transform: `translateX(${selectMode ? 0 : offset}px)`,
                    transition: dragging ? 'none' : 'transform .22s cubic-bezier(.22,1,.36,1)',
                    touchAction: 'pan-y',
                }}
                className={`relative flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft ${
                    selectMode
                        ? `cursor-pointer ${selected ? 'border-ink ring-1 ring-ink' : 'border-hairline'}`
                        : 'border-hairline'
                }`}
            >
                {selectMode && <SelectBox checked={selected} />}

                {/* Miniatura: foto del producto si existe, si no un placeholder */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
                    {item.products?.image_url
                        ? <img src={item.products.image_url} alt="" className="h-full w-full object-cover" draggable={false} />
                        : <Shirt className="h-6 w-6" />}
                </div>

                {/* Contenido: en modo selección no es clicable (el contenedor toggl­ea) */}
                {selectMode ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">{content}</div>
                ) : (
                    <button type="button" onClick={handleContentClick} className="flex min-w-0 flex-1 flex-col gap-1.5 text-left active:scale-[0.99]">
                        {content}
                    </button>
                )}

                {/* Precio + acciones */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`font-mono text-sm font-semibold ${item.status === 'vendido' ? 'text-status-available' : 'text-ink'}`}>
                        {formatCurrency(price)}
                    </span>
                    {!selectMode && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onEdit(); }}
                                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-ink active:scale-95"
                                aria-label="Editar"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={handleContentClick} className="text-muted-foreground active:scale-95" aria-label="Ver detalle">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
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
    const [txInitialStatus, setTxInitialStatus] = useState<ItemStatus | undefined>(undefined);
    const [swipedId, setSwipedId] = useState<number | null>(null);
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

    // ── Modo multi-selección / acciones masivas ──────────────────────────────
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ action: string; ok: number; failed: number } | null>(null);
    const [returnConfirm, setReturnConfirm] = useState(false);
    const [remateOpen, setRemateOpen] = useState(false);
    const [ratePrice, setRatePrice] = useState('');
    const [ratePaymentMethod, setRatePaymentMethod] = useState<PaymentMethod>('efectivo');

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
        setTxInitialStatus(undefined);
        setIsModalOpen(true);
    };

    // Atajo de swipe: abre la transacción con un estatus objetivo ya preseleccionado.
    const openQuickStatus = (item: InventoryItemWithRelations, status: ItemStatus) => {
        setSwipedId(null);
        setSelectedItem(item);
        setTxInitialStatus(status);
        setIsModalOpen(true);
    };

    const openEditItem = (item: InventoryItemWithRelations) => {
        setSwipedId(null);
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

    // ── Selección múltiple ────────────────────────────────────────────────────
    const toggleSelect = (id: number) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

    const selectedItems = useMemo(
        () => (items ?? []).filter((i) => selectedIds.has(i.id)),
        [items, selectedIds],
    );
    const visibleIds = filtered.map((i) => i.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    const toggleSelectAllVisible = () =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
            else visibleIds.forEach((id) => next.add(id));
            return next;
        });

    // Elegibilidad por acción (evita transiciones inválidas que la RPC rechazaría).
    const eligibleReturn = selectedItems.filter((i) => i.status !== 'disponible'); // regresar a stock
    const eligibleSell = selectedItems.filter((i) => i.status === 'disponible'); // remate (vender)

    // Ejecuta una acción de cambio de estado sobre un lote, secuencialmente (cada
    // ítem es una RPC atómica con su propio log). Reporta aplicadas / omitidas.
    const runBulk = async (
        action: string,
        targets: InventoryItemWithRelations[],
        newStatus: ItemStatus,
        opts?: { priceSold?: number; notes?: string; paymentMethod?: PaymentMethod },
    ) => {
        setBulkBusy(true);
        let ok = 0;
        let failed = 0;
        for (const it of targets) {
            try {
                await inventoryService.updateItemStatus({
                    itemId: it.id,
                    newStatus,
                    priceSold: opts?.priceSold ?? null,
                    notes: opts?.notes,
                    paymentMethod: opts?.paymentMethod,
                });
                ok += 1;
            } catch {
                failed += 1;
            }
        }
        setBulkBusy(false);
        setBulkResult({ action, ok, failed });
        queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
        exitSelectMode();
    };

    const handleBulkReturn = async () => {
        await runBulk('Regreso a stock', eligibleReturn, 'disponible', { notes: 'Regreso a stock (lote)' });
        setReturnConfirm(false);
    };
    const handleBulkSell = async () => {
        const price = parseFloat(ratePrice.replace(/,/g, '.'));
        if (!(price > 0)) return;
        await runBulk('Remate', eligibleSell, 'vendido', { priceSold: price, notes: 'Venta en lote (remate)', paymentMethod: ratePaymentMethod });
        setRemateOpen(false);
        setRatePrice('');
    };

    // Exporta el inventario filtrado a CSV (respeta filtros de estado, texto y avanzados).
    const handleExport = () => {
        const headers = [
            'ID', 'Producto', 'Marca', 'Categoría', 'Talla', 'Color', 'Estatus',
            'Precio base', 'Precio venta', 'Cliente apartado', 'Contacto', 'Vence', 'Anticipo',
        ];
        const rows = filtered.map((i) => [
            i.id,
            i.products?.name ?? '',
            i.products?.brands?.name ?? '',
            i.products?.categories?.name ?? '',
            i.size,
            i.color,
            STATUS_CONFIG[i.status]?.label ?? i.status,
            i.products?.base_price ?? '',
            i.price_sold ?? '',
            i.reserved_for ?? '',
            i.reserved_contact ?? '',
            i.reserved_until ?? '',
            i.reserved_deposit ?? '',
        ]);
        downloadCsv(`inventario-${todayStamp()}.csv`, headers, rows);
    };

    if (isError) return (
        <div className="flex h-48 items-center justify-center text-status-returned">
            Error al cargar el inventario.
        </div>
    );

    return (
        <div className={`mx-auto max-w-6xl space-y-5 ${selectMode ? 'pb-28 sm:pb-24' : ''}`}>
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
                <div className="flex shrink-0 items-center gap-2">
                    {!selectMode && (
                        <>
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={filtered.length === 0}
                                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-10"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <RoleGuard allowed={['socio', 'superadmin']}>
                                <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Agregar Prenda</span>
                                    <span className="sm:hidden">Agregar</span>
                                </Button>
                            </RoleGuard>
                        </>
                    )}
                    {/* Modo selección: aplicar acciones a varias prendas a la vez */}
                    <button
                        type="button"
                        onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                        disabled={!selectMode && (items?.length ?? 0) === 0}
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-10"
                    >
                        {selectMode ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                        <span className="hidden sm:inline">{selectMode ? 'Cancelar' : 'Seleccionar'}</span>
                    </button>
                </div>
            </div>

            {/* Resultado de la última acción masiva (banner descartable) */}
            {bulkResult && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-secondary px-4 py-2.5 text-sm">
                    <span className="text-ink">
                        <span className="font-semibold">{bulkResult.action}:</span> {bulkResult.ok} aplicada{bulkResult.ok !== 1 ? 's' : ''}
                        {bulkResult.failed > 0 ? ` · ${bulkResult.failed} omitida${bulkResult.failed !== 1 ? 's' : ''}` : ''}.
                    </span>
                    <button onClick={() => setBulkResult(null)} aria-label="Cerrar" className="text-muted-foreground transition-colors hover:text-ink">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

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
                            onQuickStatus={(status) => openQuickStatus(item, status)}
                            selectMode={selectMode}
                            selected={selectedIds.has(item.id)}
                            onToggleSelect={() => toggleSelect(item.id)}
                            swipeOpen={swipedId === item.id}
                            onSwipeOpenChange={(open) => setSwipedId((prev) => (open ? item.id : (prev === item.id ? null : prev)))}
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
                            {selectMode && (
                                <TableHead className="w-[44px]">
                                    <button onClick={toggleSelectAllVisible} aria-label="Seleccionar todo lo visible" className="align-middle">
                                        <SelectBox checked={allVisibleSelected} />
                                    </button>
                                </TableHead>
                            )}
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
                                className={`border-hairline hover:bg-secondary/60 ${
                                    selectMode && selectedIds.has(item.id) ? 'bg-secondary/60' : ''
                                } cursor-pointer`}
                                onClick={() => (selectMode ? toggleSelect(item.id) : openItem(item))}
                            >
                                {selectMode && (
                                    <TableCell className="w-[44px]">
                                        <SelectBox checked={selectedIds.has(item.id)} />
                                    </TableCell>
                                )}
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
                                <TableCell>
                                    <StatusPill status={item.status} />
                                    <div className="mt-1"><ReservationLine item={item} /></div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.status === 'vendido'
                                        ? <span className="font-mono font-semibold text-status-available">{formatCurrency(item.price_sold)}</span>
                                        : <span className="font-mono text-ink">{formatCurrency(item.products?.base_price)}</span>
                                    }
                                </TableCell>
                                <TableCell className="text-right">
                                    {!selectMode && (
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
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && filtered.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={selectMode ? 9 : 8} className="h-24 text-center text-muted-foreground">
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

            {/* ── Barra de acciones masivas (fija, aparece en modo selección) ── */}
            {selectMode && (
                <div className="fixed inset-x-0 bottom-16 z-40 px-3 sm:bottom-6">
                    <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-hairline bg-card p-2.5 shadow-lg">
                        <button
                            onClick={toggleSelectAllVisible}
                            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-ink"
                        >
                            {allVisibleSelected ? 'Ninguna' : 'Todas'}
                        </button>
                        <span className="shrink-0 font-mono text-sm font-semibold text-ink">{selectedIds.size}</span>
                        <span className="hidden text-xs text-muted-foreground sm:inline">seleccionada{selectedIds.size !== 1 ? 's' : ''}</span>
                        <div className="flex-1" />
                        <Button
                            variant="outline"
                            className="gap-1.5"
                            disabled={eligibleReturn.length === 0 || bulkBusy}
                            onClick={() => setReturnConfirm(true)}
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="hidden sm:inline">Regresar a stock</span>
                            <span className="font-mono text-xs">{eligibleReturn.length > 0 ? eligibleReturn.length : ''}</span>
                        </Button>
                        <Button
                            className="gap-1.5"
                            disabled={eligibleSell.length === 0 || bulkBusy}
                            onClick={() => setRemateOpen(true)}
                        >
                            <Banknote className="h-4 w-4" />
                            <span className="hidden sm:inline">Vender</span>
                            <span className="font-mono text-xs">{eligibleSell.length > 0 ? eligibleSell.length : ''}</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* Remate: vender varias prendas disponibles al mismo precio */}
            <Dialog open={remateOpen} onOpenChange={(o) => { if (!bulkBusy) setRemateOpen(o); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Vender en lote (remate)</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Se marcarán <span className="font-semibold text-ink">{eligibleSell.length}</span> prenda
                            {eligibleSell.length !== 1 ? 's' : ''} disponible{eligibleSell.length !== 1 ? 's' : ''} como{' '}
                            <span className="font-semibold text-status-sold">vendidas</span>, al mismo precio cada una.
                        </p>
                        <div className="grid gap-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Precio por prenda (MXN) *</Label>
                            <Input
                                type="number" inputMode="decimal" step="0.01" min="0"
                                value={ratePrice} onChange={(e) => setRatePrice(e.target.value)}
                                placeholder="ej. 150.00" className="h-11 font-mono" autoFocus
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Método de pago</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['efectivo', 'transferencia', 'tarjeta'] as PaymentMethod[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setRatePaymentMethod(m)}
                                        className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-all ${
                                            ratePaymentMethod === m
                                                ? 'border-ink bg-ink text-white'
                                                : 'border-hairline bg-card text-muted-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {parseFloat(ratePrice.replace(/,/g, '.')) > 0 && eligibleSell.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Total del remate:{' '}
                                <span className="font-mono font-semibold text-ink">
                                    {formatCurrency(parseFloat(ratePrice.replace(/,/g, '.')) * eligibleSell.length)}
                                </span>
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemateOpen(false)} disabled={bulkBusy}>Cancelar</Button>
                        <Button onClick={handleBulkSell} disabled={!(parseFloat(ratePrice.replace(/,/g, '.')) > 0) || bulkBusy}>
                            {bulkBusy ? 'Procesando…' : `Vender ${eligibleSell.length}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Regresar a stock: confirmación */}
            <Dialog open={returnConfirm} onOpenChange={(o) => { if (!bulkBusy) setReturnConfirm(o); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Regresar a stock</DialogTitle></DialogHeader>
                    <p className="py-1 text-sm text-muted-foreground">
                        ¿Regresar <span className="font-semibold text-ink">{eligibleReturn.length}</span> prenda
                        {eligibleReturn.length !== 1 ? 's' : ''} a estado <span className="font-semibold text-status-available">disponible</span>?
                        Las que estén apartadas perderán los datos del cliente.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReturnConfirm(false)} disabled={bulkBusy}>Cancelar</Button>
                        <Button onClick={handleBulkReturn} disabled={bulkBusy || eligibleReturn.length === 0}>
                            {bulkBusy ? 'Procesando…' : 'Regresar a stock'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Modales ───────────────────────────────────────────── */}
            <TransactionModal
                item={selectedItem}
                isOpen={isModalOpen}
                initialStatus={txInitialStatus}
                onClose={() => { setIsModalOpen(false); setTxInitialStatus(undefined); }}
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
