import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analytics';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, Trophy } from 'lucide-react';

const money = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

// Monto compacto para etiquetas ($12.5k) — evita saturar las gráficas.
const compact = (n: number) => {
    const a = Math.abs(n);
    const s = n < 0 ? '−' : '';
    if (a >= 1000) return `${s}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
    return `${s}$${Math.round(a)}`;
};

const TRACK_PX = 120;

export function BusinessAnalytics() {
    const { data, isLoading } = useQuery({
        queryKey: ['businessAnalytics'],
        queryFn: () => analyticsService.getBusinessAnalytics(6),
    });

    const months = data?.months ?? [];
    const topProducts = data?.topProducts ?? [];
    const maxRevenue = Math.max(1, ...months.map((m) => m.revenue));
    const maxTop = Math.max(1, ...topProducts.map((p) => p.revenue));
    const hasSales = months.some((m) => m.revenue !== 0);

    return (
        <section>
            <div className="mb-4 flex items-center gap-2">
                <h2 className="font-heading text-xl font-semibold text-ink">Análisis del Negocio</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finanzas
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Tendencia de 6 meses */}
                <div className="rounded-xl border border-hairline bg-card p-4 shadow-soft md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-ink">
                            <TrendingUp className="h-4 w-4" />
                            <h3 className="text-sm font-semibold">Ingresos y utilidad</h3>
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">6 meses</span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />Ingresos</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-status-available" />Utilidad neta</span>
                    </div>

                    {isLoading ? (
                        <Skeleton className="mt-4 h-[168px] w-full" />
                    ) : hasSales ? (
                        <div className="mt-4 flex items-end gap-2">
                            {months.map((m) => {
                                const barPx = Math.max(3, Math.round((m.revenue / maxRevenue) * TRACK_PX));
                                return (
                                    <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                                        <div className="flex w-full items-end justify-center" style={{ height: TRACK_PX }}>
                                            <div
                                                className="w-7 rounded-t bg-ink transition-all"
                                                style={{ height: barPx }}
                                                title={`${m.label}: ${money(m.revenue)} ingresos`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                                        <span className={`font-mono text-[10px] font-semibold ${m.net >= 0 ? 'text-status-available' : 'text-status-returned'}`}>
                                            {compact(m.net)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-4 flex h-[140px] items-center justify-center text-center text-sm text-muted-foreground">
                            Aún no hay ventas registradas para graficar.
                        </div>
                    )}
                </div>

                {/* Top productos del mes */}
                <div className="rounded-xl border border-hairline bg-card p-4 shadow-soft md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-ink">
                            <Trophy className="h-4 w-4" />
                            <h3 className="text-sm font-semibold">Más vendidos</h3>
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {data?.currentLabel ?? 'Este mes'}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="mt-4 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                        </div>
                    ) : topProducts.length > 0 ? (
                        <ol className="mt-4 space-y-3">
                            {topProducts.map((p, i) => (
                                <li key={p.name}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="font-mono text-[11px] text-muted-foreground">{i + 1}.</span>
                                            <span className="truncate text-ink">{p.name}</span>
                                        </span>
                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                            {p.units} u · <span className="text-ink">{money(p.revenue)}</span>
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                                        <div className="h-full rounded-full bg-status-available" style={{ width: `${Math.max(4, (p.revenue / maxTop) * 100)}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="mt-4 flex h-[140px] items-center justify-center text-center text-sm text-muted-foreground">
                            Sin ventas este mes todavía.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
