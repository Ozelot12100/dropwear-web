import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks';
import { dashboardService } from '../services/dashboard';
import { Skeleton } from '../components/ui/skeleton';
import { Package, Bookmark, Tag, Banknote, Calendar, type LucideIcon } from 'lucide-react';

// Roles que pueden ver información financiera (utilidad/margen).
const FINANCIAL_ROLES = ['superadmin', 'socio', 'contador'];

export default function DashboardPage() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const canSeeFinancial = profile?.role ? FINANCIAL_ROLES.includes(profile.role) : false;

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getDashboardStats,
    });

    const { data: recentLogs, isLoading: isLoadingLogs } = useQuery({
        queryKey: ['recentActivity'],
        queryFn: dashboardService.getRecentActivity,
    });

    // Realtime en lugar de polling: cualquier cambio en el inventario refresca
    // métricas y actividad. Los cambios de estado y altas escriben el ítem y su
    // log en la misma transacción, así que escuchar inventory_items cubre todo.
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
                queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    const formatDate = (dateString: string) =>
        new Intl.DateTimeFormat('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
        }).format(new Date(dateString));

    const todayLabel = new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
    })
        .format(new Date())
        .toUpperCase()
        .replace('.', '');

    const actionTextMap: Record<string, string> = {
        creacion: 'registró una prenda',
        actualizacion_estado: 'actualizó el estado de',
        venta: 'registró una venta de',
        devolucion: 'devolvió',
        apartado: 'apartó',
    };

    const categoryMap: Record<string, { label: string; color: string }> = {
        creacion: { label: 'Registro', color: 'text-muted-foreground' },
        actualizacion_estado: { label: 'Estado', color: 'text-muted-foreground' },
        venta: { label: 'Venta', color: 'text-status-available' },
        devolucion: { label: 'Devolución', color: 'text-status-returned' },
        apartado: { label: 'Apartado', color: 'text-status-reserved' },
    };

    // Configuración de las 4 tarjetas KPI (barra lateral de estatus + número en mono).
    const overdue = stats?.overdueReservedCount ?? 0;
    // Utilidad y margen del día (solo para roles financieros)
    const profit = stats?.totalProfit ?? 0;
    const marginPct = stats && stats.totalRevenue > 0 ? Math.round((profit / stats.totalRevenue) * 100) : null;

    const metrics: {
        key: string;
        label: string;
        value: string | number | undefined;
        caption: string;
        icon: LucideIcon;
        bar: string;
        valueClass: string;
        big?: boolean;
        subNote?: { text: string; className: string } | null;
    }[] = [
        {
            key: 'available',
            label: 'Disponibles',
            value: stats?.availableCount,
            caption: 'Prendas en piso',
            icon: Package,
            bar: 'bg-status-available',
            valueClass: 'text-ink',
            big: true,
        },
        {
            key: 'reserved',
            label: 'Apartados',
            value: stats?.reservedCount,
            caption: 'Pendientes de pago',
            icon: Bookmark,
            bar: 'bg-status-reserved',
            valueClass: 'text-status-reserved',
            big: true,
            subNote: overdue > 0
                ? { text: `${overdue} vencido${overdue > 1 ? 's' : ''}`, className: 'text-status-returned' }
                : null,
        },
        {
            key: 'sold',
            label: 'Ventas Hoy',
            value: stats?.soldCount,
            caption: 'Artículos vendidos',
            icon: Tag,
            bar: 'bg-ink',
            valueClass: 'text-ink',
            big: true,
        },
        {
            key: 'revenue',
            label: 'Ingresos Hoy',
            value: formatCurrency(stats?.totalRevenue || 0),
            caption: 'Recaudación del día',
            icon: Banknote,
            bar: 'bg-status-available',
            valueClass: 'text-status-available',
            big: false,
            subNote: canSeeFinancial
                ? {
                    text: `Utilidad ${formatCurrency(profit)}${marginPct != null ? ` · ${marginPct}%` : ''}`,
                    className: profit >= 0 ? 'text-status-available' : 'text-status-returned',
                }
                : null,
        },
    ];

    return (
        <div className="mx-auto max-w-5xl space-y-10">
            {/* Encabezado */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-ink md:text-[32px] md:leading-tight">
                        Resumen Ejecutivo
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Métricas clave del día y actividad reciente de la sucursal.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-lg border border-hairline bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink">
                    <Calendar className="h-4 w-4" />
                    Hoy, {todayLabel}
                </div>
            </div>

            {/* Rejilla de KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {metrics.map(({ key, label, value, caption, icon: Icon, bar, valueClass, big, subNote }) => (
                    <div
                        key={key}
                        className="relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-card p-4 shadow-soft transition-transform active:scale-[0.98] md:h-40 md:p-6"
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div
                                    className={`font-mono leading-none ${valueClass} ${
                                        big ? 'text-[28px] md:text-[34px]' : 'text-[22px] md:text-[26px]'
                                    }`}
                                >
                                    {value ?? '—'}
                                </div>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
                            {subNote && (
                                <p className={`mt-0.5 text-[11px] font-semibold ${subNote.className}`}>{subNote.text}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actividad reciente */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-xl font-semibold text-ink">Últimas Actividades</h2>
                    <Link
                        to="/logs"
                        className="text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:text-brand"
                    >
                        Ver todo
                    </Link>
                </div>

                <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
                    {isLoadingLogs ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full max-w-[220px]" />
                                    <Skeleton className="h-3 w-full max-w-[150px]" />
                                </div>
                            </div>
                        ))
                    ) : recentLogs && recentLogs.length > 0 ? (
                        recentLogs.map((log) => {
                            const userName = log.user_profiles?.full_name || 'Sistema';
                            const productName = log.inventory_items?.products?.name || 'Artículo desconocido';
                            const actionWord = actionTextMap[log.action] || log.action;
                            const category = categoryMap[log.action] || {
                                label: log.action,
                                color: 'text-muted-foreground',
                            };
                            const isSale = log.action === 'venta';
                            const initial = userName.charAt(0).toUpperCase();
                            const size = log.inventory_items?.size;
                            const color = log.inventory_items?.color;
                            const variant = size || color ? ` (${[size, color].filter(Boolean).join(', ')})` : '';

                            return (
                                <div key={log.id} className="flex items-center justify-between gap-3 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                                isSale ? 'bg-ink text-white' : 'bg-secondary text-ink'
                                            }`}
                                        >
                                            {initial}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm leading-snug text-ink">
                                                <span className="font-semibold">{userName}</span> {actionWord}{' '}
                                                <span className="font-medium">{productName}</span>
                                                {variant}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {log.created_at ? formatDate(log.created_at) : 'N/A'}
                                                {log.notes ? ` • ${log.notes}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {isSale && log.inventory_items?.price_sold ? (
                                            <div className="font-mono text-sm text-status-available">
                                                +{formatCurrency(log.inventory_items.price_sold)}
                                            </div>
                                        ) : null}
                                        <span
                                            className={`text-[10px] font-semibold uppercase tracking-wider ${category.color}`}
                                        >
                                            {category.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            No hay actividad reciente.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
