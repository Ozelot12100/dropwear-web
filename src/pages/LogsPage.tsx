import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsService } from '../services/logs';
import { useAuth } from '../hooks';
import type { LogAction } from '../types';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Filter, Users, Calendar } from 'lucide-react';
import { isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

// ── Mapas de color y etiqueta ─────────────────────────────────────────────────
const actionColorMap: Record<string, string> = {
    creacion: 'bg-blue-100 text-blue-800',
    actualizacion_estado: 'bg-gray-100 text-gray-800',
    venta: 'bg-green-100 text-green-800',
    apartado: 'bg-yellow-100 text-yellow-800',
    devolucion: 'bg-red-100 text-red-800',
};

const actionLabelMap: Record<string, string> = {
    creacion: '🆕 Creación',
    actualizacion_estado: '🔄 Actualización',
    venta: '💰 Venta',
    apartado: '📌 Apartado',
    devolucion: '↩️ Devolución',
};

const statusLabel: Record<string, string> = {
    disponible: 'Disponible',
    apartado: 'Apartado',
    vendido: 'Vendido',
    devuelto: 'Devuelto',
};

// ── Pills de filtro por acción ────────────────────────────────────────────────
const ACTION_FILTERS: { label: string; value: LogAction | 'todas' }[] = [
    { label: 'Todas', value: 'todas' },
    { label: '💰 Ventas', value: 'venta' },
    { label: '📌 Apartados', value: 'apartado' },
    { label: '↩️ Devoluciones', value: 'devolucion' },
    { label: '🆕 Altas', value: 'creacion' },
    { label: '🔄 Cambios', value: 'actualizacion_estado' },
];

// Roles que pueden ver la columna de precio de venta
const FINANCIAL_ROLES = ['superadmin', 'socio', 'contador'];

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
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

    if (isError) return (
        <div className="flex items-center justify-center h-48 text-red-500">
            Error al cargar el historial operativo.
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header y Botón Sheet */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        Bitácora Operativa
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500">
                        Historial inmutable de todas las operaciones registradas.
                    </p>
                </div>

                {/* Filtros avanzados Sheet */}
                <Sheet>
                    <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 shrink-0 relative">
                        <Filter className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Filtros de Historial</SheetTitle>
                            <SheetDescription>
                                Filtra las operaciones por usuario y fecha.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="space-y-8 mt-2">
                            {/* Filtro Usuarios */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold flex items-center text-slate-700">
                                    <Users className="w-4 h-4 mr-2 text-indigo-500" />
                                    Operador (Staff)
                                </Label>
                                <Select
                                    value={advancedFilters.user}
                                    onValueChange={(val) => setAdvancedFilters(prev => ({ ...prev, user: val || 'todos' }))}
                                >
                                    <SelectTrigger className="w-full h-12 bg-slate-50 border-transparent hover:bg-slate-100 focus:ring-indigo-500">
                                        <SelectValue placeholder="Todos los operadores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos" className="font-medium text-slate-500">Todos los operadores</SelectItem>
                                        {dynamicUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro Tiempo (Pills) */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold flex items-center text-slate-700">
                                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
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
                                                className={`px-3 py-2.5 rounded-lg text-sm transition-all sm:col-span-1 ${isSelected
                                                        ? 'bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-600 ring-offset-1'
                                                        : 'bg-slate-100 text-slate-600 font-medium hover:bg-slate-200'
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
                            <SheetClose className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto">
                                Aplicar Filtros
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Pills de filtro por acción ────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {ACTION_FILTERS.map(({ label, value }) => {
                    const count = value === 'todas'
                        ? (logs?.length ?? 0)
                        : (counts[value] ?? 0);
                    const isActive = actionFilter === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setActionFilter(value)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${isActive
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            {label}
                            <span className={`text-[10px] ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                                {isLoading ? '—' : count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tabla ────────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                        Historial de Operaciones{' '}
                        {!isLoading && (
                            <span className="text-sm font-normal text-gray-400">
                                ({filtered.length}{actionFilter !== 'todas' ? ` de ${logs?.length ?? 0}` : ''} registros)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>Prenda</TableHead>
                                    <TableHead>Operador</TableHead>
                                    <TableHead>Acción</TableHead>
                                    <TableHead>Estado</TableHead>
                                    {canSeeFinancial && <TableHead className="text-right">Precio Venta</TableHead>}
                                    <TableHead>Notas</TableHead>
                                    <TableHead>Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Estado de carga: skeleton rows */}
                                {isLoading && <LogsTableSkeleton cols={totalCols} />}

                                {/* Datos */}
                                {!isLoading && filtered.map((log) => {
                                    const item = log.inventory_items;
                                    const product = item?.products;
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-gray-400">#{log.id}</TableCell>

                                            {/* Prenda */}
                                            <TableCell>
                                                <div className="font-medium">{product?.name ?? '—'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {product?.brands?.name} · T.{item?.size} · <span className="capitalize">{item?.color}</span>
                                                </div>
                                            </TableCell>

                                            {/* Operador */}
                                            <TableCell className="text-sm">
                                                {log.user_profiles?.full_name ?? (
                                                    <span className="text-gray-400 italic">Eliminado</span>
                                                )}
                                            </TableCell>

                                            {/* Acción */}
                                            <TableCell>
                                                <Badge className={actionColorMap[log.action] ?? 'bg-gray-100'}>
                                                    {actionLabelMap[log.action] ?? log.action}
                                                </Badge>
                                            </TableCell>

                                            {/* Transición de estado */}
                                            <TableCell className="whitespace-nowrap">
                                                {log.previous_status ? (
                                                    <span className="text-xs text-gray-500">
                                                        {statusLabel[log.previous_status]}{' '}
                                                        <span className="text-gray-400">→</span>{' '}
                                                        <span className="font-medium text-gray-900">
                                                            {log.new_status ? statusLabel[log.new_status] : '—'}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-gray-900">
                                                        {log.new_status ? statusLabel[log.new_status] : '—'}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Precio de venta (solo roles financieros) */}
                                            {canSeeFinancial && (
                                                <TableCell className="text-right font-medium">
                                                    {log.inventory_items?.price_sold != null
                                                        ? <span className="text-green-700">${log.inventory_items.price_sold.toFixed(2)}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </TableCell>
                                            )}

                                            {/* Notas */}
                                            <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">
                                                {log.notes ?? <span className="italic text-gray-300">—</span>}
                                            </TableCell>

                                            {/* Fecha */}
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDate(log.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* Estado vacío */}
                                {!isLoading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={totalCols} className="h-24 text-center text-gray-400">
                                            {actionFilter !== 'todas'
                                                ? `No hay registros de "${actionLabelMap[actionFilter]}" aún.`
                                                : 'No hay operaciones registradas aún.'
                                            }
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
