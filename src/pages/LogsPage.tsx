import { useQuery } from '@tanstack/react-query';
import { logsService } from '../services/logs';
import { useAuth } from '../hooks';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

// Mapas de color y etiqueta para acciones y estados
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

// Roles que pueden ver la columna de precio de venta
const FINANCIAL_ROLES = ['superadmin', 'socio', 'contador'];

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function LogsPage() {
    const { profile } = useAuth();
    const canSeeFinancial = profile?.role ? FINANCIAL_ROLES.includes(profile.role) : false;

    const { data: logs, isLoading, isError } = useQuery({
        queryKey: ['inventory_logs'],
        queryFn: logsService.getLogs,
    });

    if (isLoading) return <div className="text-gray-500 py-10 text-center">Cargando bitácora...</div>;
    if (isError) return <div className="text-red-500 py-10 text-center">Error al cargar el historial operativo.</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bitácora Operativa</h1>
                <p className="text-sm text-gray-500">
                    Historial inmutable de todas las operaciones registradas en el inventario.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Historial de Operaciones{' '}
                        <span className="text-sm font-normal text-gray-400">
                            ({logs?.length ?? 0} registros)
                        </span>
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
                                {logs?.map((log) => {
                                    const item = log.inventory_items;
                                    const product = item?.products;
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-gray-400">#{log.id}</TableCell>

                                            {/* Prenda */}
                                            <TableCell>
                                                <div className="font-medium">{product?.name ?? '—'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {product?.brands?.name} · Talla {item?.size} · {item?.color}
                                                </div>
                                            </TableCell>

                                            {/* Operador */}
                                            <TableCell className="text-sm">
                                                {log.user_profiles?.full_name ?? (
                                                    <span className="text-gray-400 italic">Usuario eliminado</span>
                                                )}
                                            </TableCell>

                                            {/* Acción */}
                                            <TableCell>
                                                <Badge className={actionColorMap[log.action] ?? 'bg-gray-100'}>
                                                    {actionLabelMap[log.action] ?? log.action}
                                                </Badge>
                                            </TableCell>

                                            {/* Transición de estado */}
                                            <TableCell>
                                                {log.previous_status ? (
                                                    <span className="text-xs text-gray-500">
                                                        {statusLabel[log.previous_status]} →{' '}
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
                                                <TableCell className="text-right font-medium text-green-700">
                                                    {log.action === 'venta' && log.new_status === 'vendido'
                                                        ? '—'
                                                        : '—'}
                                                </TableCell>
                                            )}

                                            {/* Notas */}
                                            <TableCell className="text-sm text-gray-500 max-w-[180px] truncate">
                                                {log.notes ?? <span className="italic text-gray-300">—</span>}
                                            </TableCell>

                                            {/* Fecha */}
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDate(log.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {logs?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={canSeeFinancial ? 8 : 7} className="h-24 text-center text-gray-400">
                                            No hay operaciones registradas aún.
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
