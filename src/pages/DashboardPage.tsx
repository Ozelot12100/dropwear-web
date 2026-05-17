import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Package, DollarSign, Clock, ShoppingCart, Tag } from 'lucide-react';

export default function DashboardPage() {
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getDashboardStats,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: recentLogs, isLoading: isLoadingLogs } = useQuery({
        queryKey: ['recentActivity'],
        queryFn: dashboardService.getRecentActivity,
        refetchInterval: 30000,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        }).format(new Date(dateString));
    };

    const actionTextMap: Record<string, string> = {
        'creacion': 'registró una prenda',
        'actualizacion_estado': 'actualizó el estado de',
        'venta': 'registró una venta de',
        'devolucion': 'devolvió',
        'apartado': 'apartó'
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resumen Ejecutivo</h1>
                <p className="text-sm text-gray-500">Métricas clave del día y actividad reciente de la sucursal.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Disponibles */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Disponibles</CardTitle>
                        <Package className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{stats?.availableCount}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Prendas en piso</p>
                    </CardContent>
                </Card>

                {/* Apartados */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Apartados</CardTitle>
                        <Clock className="w-4 h-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{stats?.reservedCount}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Pendientes de pago</p>
                    </CardContent>
                </Card>

                {/* Ventas de Hoy */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Ventas Hoy</CardTitle>
                        <ShoppingCart className="w-4 h-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{stats?.soldCount}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Artículos vendidos</p>
                    </CardContent>
                </Card>

                {/* Recaudado Hoy */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Ingresos Hoy</CardTitle>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(stats?.totalRevenue || 0)}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Recaudación del día</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="w-5 h-5 text-gray-400" />
                        Últimas Actividades
                    </CardTitle>
                    <CardDescription>
                        Registro de los últimos movimientos realizados en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoadingLogs ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-full max-w-[200px]" />
                                        <Skeleton className="h-3 w-full max-w-[150px]" />
                                    </div>
                                </div>
                            ))
                        ) : recentLogs && recentLogs.length > 0 ? (
                            recentLogs.map((log) => {
                                const userName = log.user_profiles?.full_name || 'Sistema';
                                const productName = log.inventory_items?.products?.name || 'Artículo Desconocido';
                                const actionWord = actionTextMap[log.action] || log.action;
                                const isSale = log.action === 'venta';
                                
                                return (
                                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-900">
                                                <span className="font-semibold">{userName}</span> {actionWord} <span className="font-medium text-gray-700">{productName}</span> ({log.inventory_items?.size}, {log.inventory_items?.color})
                                            </span>
                                            {log.notes && <span className="text-xs text-gray-500 mt-0.5">Nota: {log.notes}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                            {isSale && log.inventory_items?.price_sold && (
                                                <span className="text-sm font-bold text-green-600">
                                                    +{formatCurrency(log.inventory_items.price_sold)}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 font-mono">
                                                {log.created_at ? formatDate(log.created_at) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                No hay actividad reciente.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
