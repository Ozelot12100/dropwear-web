import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsService } from '../services/logs';
import { useAuth } from '../hooks';
import type { LogAction } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { SlidersHorizontal, Users, Calendar, Banknote, Bookmark, CornerUpLeft, PlusSquare, RefreshCw, Download, type LucideIcon } from 'lucide-react';
import { isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { downloadCsv, todayStamp } from '../lib/csv';

// ── Metadatos por tipo de operación (diseño Stitch) ───────────────────────────
type OpMeta = {
    title: string;
    Icon: LucideIcon;
    bar: string;
    pill: string;
    pillLabel: string;
    amountClass: string;
    sign: string;
};

const OPERATION_META: Record<string, OpMeta> = {
    venta: { title: 'Venta Realizada', Icon: Banknote, bar: 'bg-status-available', pill: 'bg-status-available/10 text-status-available', pillLabel: 'Venta', amountClass: 'text-status-available', sign: '+' },
    apartado: { title: 'Apartado', Icon: Bookmark, bar: 'bg-status-reserved', pill: 'bg-status-reserved/10 text-status-reserved', pillLabel: 'Apartado', amountClass: 'text-status-reserved', sign: '' },
    devolucion: { title: 'Devolución', Icon: CornerUpLeft, bar: 'bg-status-returned', pill: 'bg-status-returned/10 text-status-returned', pillLabel: 'Devolución', amountClass: 'text-status-returned', sign: '−' },
    creacion: { title: 'Alta de Producto', Icon: PlusSquare, bar: 'bg-ink', pill: 'bg-secondary text-muted-foreground', pillLabel: 'Alta', amountClass: 'text-ink', sign: '' },
    actualizacion_estado: { title: 'Cambio de Estado', Icon: RefreshCw, bar: 'bg-status-sold', pill: 'bg-status-sold/10 text-status-sold', pillLabel: 'Cambio', amountClass: 'text-ink', sign: '' },
};

const fallbackOp: OpMeta = { title: 'Operación', Icon: RefreshCw, bar: 'bg-muted-foreground', pill: 'bg-secondary text-muted-foreground', pillLabel: '—', amountClass: 'text-ink', sign: '' };

const statusLabel: Record<string, string> = {
    disponible: 'Disponible',
    apartado: 'Apartado',
    vendido: 'Vendido',
    devuelto: 'Devuelto',
};

// ── Pills de filtro por acción (con punto de color) ───────────────────────────
const ACTION_FILTERS: { label: string; value: LogAction | 'todas'; dot: string | null }[] = [
    { label: 'Todas', value: 'todas', dot: null },
    { label: 'Ventas', value: 'venta', dot: 'bg-status-available' },
    { label: 'Apartados', value: 'apartado', dot: 'bg-status-reserved' },
    { label: 'Devoluciones', value: 'devolucion', dot: 'bg-status-returned' },
    { label: 'Altas', value: 'creacion', dot: 'bg-ink' },
    { label: 'Cambios', value: 'actualizacion_estado', dot: 'bg-status-sold' },
];

// Roles que pueden ver la columna de precio de venta
const FINANCIAL_ROLES = ['superadmin', 'socio', 'contador'];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// Devuelve { time, day } para las tarjetas móviles (ej. "14:20" · "Hoy")
function formatRelative(iso: string | null): { time: string; day: string } {
    if (!iso) return { time: '—', day: '' };
    const d = new Date(iso);
    const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const date = parseISO(iso);
    let day: string;
    if (isToday(date)) day = 'Hoy';
    else if (isYesterday(date)) day = 'Ayer';
    else day = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    return { time, day };
}

// ── Skeleton de carga para la tabla ──────────────────────────────────────────
function LogsTableSkeleton({ cols }: { cols: number }) {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-4 w-full rounded" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function LogsPage() {
    const { profile } = useAuth();
    const canSeeFinancial = profile?.role ? FINANCIAL_ROLES.includes(profile.role) : false;
    const totalCols = canSeeFinancial ? 8 : 7;

    const [actionFilter, setActionFilter] = useState<LogAction | 'todas'>('todas');
    const [advancedFilters, setAdvancedFilters] = useState({
        user: 'todos',
        dateRange: 'todos'
    });

    const activeFiltersCount = (advancedFilters.user !== 'todos' ? 1 : 0) + (advancedFilters.dateRange !== 'todos' ? 1 : 0);

    const { data: logs, isLoading, isError } = useQuery({
        queryKey: ['inventory_logs'],
        queryFn: logsService.getLogs,
    });

    // Extraer usuarios únicos para el filtro
    const dynamicUsers = useMemo(() => {
        if (!logs) return [];
        const u = new Map<string, string>();
        logs.forEach(l => {
            if (l.partner_id && l.user_profiles?.full_name) {
                u.set(l.partner_id, l.user_profiles.full_name);
            }
        });
        return Array.from(u.entries()).map(([id, name]) => ({ id, name }));
    }, [logs]);

    // Filtro client-side
    const filtered = useMemo(() => {
        if (!logs) return [];
        let result = logs;

        if (actionFilter !== 'todas') {
            result = result.filter(l => l.action === actionFilter);
        }

        if (advancedFilters.user !== 'todos') {
            result = result.filter(l => l.partner_id === advancedFilters.user);
        }

        if (advancedFilters.dateRange !== 'todos') {
            result = result.filter(l => {
                if (!l.created_at) return false;
                const date = parseISO(l.created_at);
                switch (advancedFilters.dateRange) {
                    case 'hoy': return isToday(date);
                    case 'ayer': return isYesterday(date);
                    case 'semana': return isThisWeek(date, { weekStartsOn: 1 });
                    case 'mes': return isThisMonth(date);
                    default: return true;
                }
            });
        }

        return result;
    }, [logs, actionFilter, advancedFilters]);

    // Contadores por acción para las pills. Se calculan sobre TODOS los logs
    // (no sobre `filtered`, que ya aplicó el filtro de acción) para que cada
    // pill muestre su total real y no 0 al seleccionar otra.
    const counts = useMemo(() => {
        return (logs ?? []).reduce<Record<string, number>>((acc, l) => {
            acc[l.action] = (acc[l.action] ?? 0) + 1;
            return acc;
        }, {});
    }, [logs]);

    // Exporta la bitácora filtrada a CSV (respeta filtros y visibilidad financiera).
    const handleExport = () => {
        const headers = [
            'ID', 'Fecha', 'Operación', 'Producto', 'Marca', 'Talla', 'Color', 'Operador',
            ...(canSeeFinancial ? ['Precio venta'] : []),
            'Estatus anterior', 'Estatus nuevo', 'Notas',
        ];
        const rows = filtered.map((log) => {
            const item = log.inventory_items;
            const product = item?.products;
            return [
                log.id,
                log.created_at ? formatDate(log.created_at) : '',
                OPERATION_META[log.action]?.pillLabel ?? log.action,
                product?.name ?? '',
                product?.brands?.name ?? '',
                item?.size ?? '',
                item?.color ?? '',
                log.user_profiles?.full_name ?? 'Eliminado',
                ...(canSeeFinancial ? [item?.price_sold ?? ''] : []),
                log.previous_status ? statusLabel[log.previous_status] ?? '' : '',
                log.new_status ? statusLabel[log.new_status] ?? '' : '',
                log.notes ?? '',
            ];
        });
        downloadCsv(`bitacora-${todayStamp()}.csv`, headers, rows);
    };

    if (isError) return (
        <div className="flex h-48 items-center justify-center text-status-returned">
            Error al cargar el historial operativo.
        </div>
    );

    return (
        <div className="mx-auto max-w-6xl space-y-4">
            {/* Header y Botón Sheet */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
                        Bitácora Operativa
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Historial inmutable de todas las operaciones registradas.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                {/* Exportar CSV */}
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-10"
                >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                </button>

                {/* Filtros avanzados Sheet */}
                <Sheet>
                    <SheetTrigger className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:h-10">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFiltersCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-ink text-[10px] font-bold text-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full overflow-y-auto sm:w-[400px]">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="font-heading">Filtros de Historial</SheetTitle>
                            <SheetDescription>
                                Filtra las operaciones por usuario y fecha.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="mt-2 space-y-8">
                            {/* Filtro Usuarios */}
                            <div className="space-y-3">
                                <Label className="flex items-center text-sm font-semibold text-ink">
                                    <Users className="mr-2 h-4 w-4 text-brand" />
                                    Operador (Staff)
                                </Label>
                                <Select
                                    value={advancedFilters.user}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, user: val || 'todos' }))}
                                >
                                    <SelectTrigger className="h-12 w-full border-hairline bg-secondary transition-colors hover:bg-accent">
                                        <SelectValue placeholder="Todos los operadores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos" className="font-medium text-muted-foreground">Todos los operadores</SelectItem>
                                        {dynamicUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro Tiempo (Pills) */}
                            <div className="space-y-3">
                                <Label className="flex items-center text-sm font-semibold text-ink">
                                    <Calendar className="mr-2 h-4 w-4 text-brand" />
                                    Rango de Fecha
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Siempre', value: 'todos' },
                                        { label: 'Hoy', value: 'hoy' },
                                        { label: 'Ayer', value: 'ayer' },
                                        { label: 'Esta Semana', value: 'semana' },
                                        { label: 'Este Mes', value: 'mes' },
                                    ].map(opt => {
                                        const isSelected = advancedFilters.dateRange === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setAdvancedFilters(prev => ({ ...prev, dateRange: opt.value }))}
                                                className={`rounded-lg px-3 py-2.5 text-sm transition-all ${isSelected
                                                    ? 'bg-ink font-bold text-white'
                                                    : 'bg-secondary font-medium text-muted-foreground hover:bg-accent'
                                                    }`}
                                            >
                                                {opt.label}
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
                                    onClick={() => setAdvancedFilters({ user: 'todos', dateRange: 'todos' })}
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
            </div>

            {/* ── Pills de filtro por acción ────────────────────────── */}
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {ACTION_FILTERS.map(({ label, value, dot }) => {
                    const count = value === 'todas'
                        ? (logs?.length ?? 0)
                        : (counts[value] ?? 0);
                    const isActive = actionFilter === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setActionFilter(value)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${isActive
                                ? 'border-ink bg-ink text-white'
                                : 'border-hairline bg-card text-muted-foreground hover:border-muted-foreground/40'
                                }`}
                        >
                            {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
                            {label}
                            <span className={`font-mono text-[10px] ${isActive ? 'opacity-70' : 'text-muted-foreground/70'}`}>
                                {isLoading ? '—' : count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Vista MÓVIL: tarjetas ──────────────────────────────── */}
            <div className="space-y-3 sm:hidden">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-hairline bg-card p-4">
                        <div className="flex gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                        </div>
                    </div>
                ))}

                {!isLoading && filtered.map((log) => {
                    const meta = OPERATION_META[log.action] ?? fallbackOp;
                    const item = log.inventory_items;
                    const product = item?.products;
                    const price = item?.price_sold;
                    const showAmount = canSeeFinancial && price != null && (log.action === 'venta' || log.action === 'devolucion');
                    const operator = log.user_profiles?.full_name ?? 'Eliminado';
                    const { time, day } = formatRelative(log.created_at);
                    const Icon = meta.Icon;

                    return (
                        <div key={log.id} className="relative overflow-hidden rounded-xl border border-hairline bg-card shadow-soft">
                            <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
                            <div className="p-4 pl-5">
                                {/* Encabezado */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-heading font-semibold text-ink">{meta.title}</p>
                                            <p className="font-mono text-xs text-muted-foreground">#{log.id}</p>
                                        </div>
                                    </div>
                                    {showAmount && (
                                        <span className={`font-mono text-sm font-semibold ${meta.amountClass}`}>
                                            {meta.sign}{formatCurrency(price!)}
                                        </span>
                                    )}
                                </div>

                                {/* Prenda */}
                                <div className="mt-3">
                                    <p className="font-medium text-ink">{product?.name ?? '—'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {[product?.brands?.name, item?.size && `T.${item.size}`, item?.color].filter(Boolean).join(' · ')}
                                    </p>
                                </div>

                                {/* Transición de estado */}
                                {log.previous_status && log.new_status && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                                        <span className="text-muted-foreground">{statusLabel[log.previous_status]}</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="font-semibold text-ink">{statusLabel[log.new_status]}</span>
                                    </div>
                                )}

                                {log.notes && (
                                    <p className="mt-2 text-xs italic text-muted-foreground">{log.notes}</p>
                                )}

                                {/* Pie: operador + fecha */}
                                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                                            {operator.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-medium text-ink">{operator}</span>
                                    </div>
                                    <span className="font-mono text-xs text-muted-foreground">{time} · {day}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {!isLoading && filtered.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        {actionFilter !== 'todas'
                            ? `No hay registros de "${OPERATION_META[actionFilter]?.pillLabel ?? actionFilter}" aún.`
                            : 'No hay operaciones registradas aún.'}
                    </div>
                )}
            </div>

            {/* ── Vista DESKTOP: tabla ───────────────────────────────── */}
            <div className="hidden overflow-x-auto rounded-xl border border-hairline bg-card shadow-soft sm:block">
                <Table>
                    <TableHeader>
                        <TableRow className="border-hairline hover:bg-transparent">
                            <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha y hora</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operación</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operador</TableHead>
                            {canSeeFinancial && <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monto</TableHead>}
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estatus</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <LogsTableSkeleton cols={totalCols} />}

                        {!isLoading && filtered.map((log) => {
                            const meta = OPERATION_META[log.action] ?? fallbackOp;
                            const item = log.inventory_items;
                            const product = item?.products;
                            const price = item?.price_sold;
                            const showAmount = price != null && (log.action === 'venta' || log.action === 'devolucion');
                            const Icon = meta.Icon;
                            const operator = log.user_profiles?.full_name;

                            return (
                                <TableRow key={log.id} className="border-hairline hover:bg-secondary/60">
                                    <TableCell className="font-mono text-muted-foreground">#{log.id}</TableCell>
                                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${meta.pill}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                            {meta.pillLabel}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-ink">{product?.name ?? '—'}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {[product?.brands?.name, item?.size && `T.${item.size}`, item?.color].filter(Boolean).join(' · ')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {operator ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                                                    {operator.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-ink">{operator}</span>
                                            </div>
                                        ) : (
                                            <span className="italic text-muted-foreground">Eliminado</span>
                                        )}
                                    </TableCell>
                                    {canSeeFinancial && (
                                        <TableCell className="text-right font-mono">
                                            {showAmount
                                                ? <span className={meta.amountClass}>{meta.sign}{formatCurrency(price!)}</span>
                                                : <span className="text-muted-foreground/50">—</span>}
                                        </TableCell>
                                    )}
                                    <TableCell className="whitespace-nowrap">
                                        {log.previous_status ? (
                                            <span className="text-xs text-muted-foreground">
                                                {statusLabel[log.previous_status]}{' '}
                                                <span className="text-muted-foreground/60">→</span>{' '}
                                                <span className="font-semibold text-ink">
                                                    {log.new_status ? statusLabel[log.new_status] : '—'}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-ink">
                                                {log.new_status ? statusLabel[log.new_status] : '—'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                                        {log.notes ?? <span className="italic text-muted-foreground/50">—</span>}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {!isLoading && filtered.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={totalCols} className="h-24 text-center text-muted-foreground">
                                    {actionFilter !== 'todas'
                                        ? `No hay registros de "${OPERATION_META[actionFilter]?.pillLabel ?? actionFilter}" aún.`
                                        : 'No hay operaciones registradas aún.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {!isLoading && filtered.length > 0 && (
                    <div className="border-t border-hairline px-4 py-3 text-xs text-muted-foreground">
                        Mostrando {filtered.length}{actionFilter !== 'todas' ? ` de ${logs?.length ?? 0}` : ''} operaciones
                    </div>
                )}
            </div>
        </div>
    );
}
