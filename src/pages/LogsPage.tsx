import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsService } from '../services/logs';
import { useAuth } from '../hooks';
import type { LogAction } from '../types';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';

// ── Mapas de color y etiqueta ─────────────────────────────────────────────────
const actionColorMap: Record<string, string> = {
    creacion:            'bg-blue-100 text-blue-800',
    actualizacion_estado:'bg-gray-100 text-gray-800',
    venta:               'bg-green-100 text-green-800',
    apartado:            'bg-yellow-100 text-yellow-800',
    devolucion:          'bg-red-100 text-red-800',
};

const actionLabelMap: Record<string, string> = {
    creacion:            '🆕 Creación',
    actualizacion_estado:'🔄 Actualización',
    venta:               '💰 Venta',
    apartado:            '📌 Apartado',
    devolucion:          '↩️ Devolución',
};

const statusLabel: Record<string, string> = {
    disponible: 'Disponible',
    apartado:   'Apartado',
    vendido:    'Vendido',
    devuelto:   'Devuelto',
};

// ── Pills de filtro por acción ────────────────────────────────────────────────
const ACTION_FILTERS: { label: string; value: LogAction | 'todas' }[] = [
    { label: 'Todas',         value: 'todas' },
    { label: '💰 Ventas',     value: 'venta' },
    { label: '📌 Apartados',  value: 'apartado' },
    { label: '↩️ Devoluciones',value: 'devolucion' },
    { label: '🆕 Altas',      value: 'creacion' },
    { label: '🔄 Cambios',    value: 'actualizacion_estado' },
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

    const { data: logs, isLoading, isError } = useQuery({
        queryKey: ['inventory_logs'],
        queryFn: logsService.getLogs,
    });

    // Filtro client-side por tipo de acción
    const filtered = useMemo(() => {
        if (!logs) return [];
        if (actionFilter === 'todas') return logs;
        return logs.filter(l => l.action === actionFilter);
    }, [logs, actionFilter]);

    // Contadores por acción para las pills
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
            {/* ── Header ───────────────────────────────────────────────── */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Bitácora Operativa
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                    Historial inmutable de todas las operaciones registradas en el inventario.
                </p>
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
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                isActive
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
