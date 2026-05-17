import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    accent: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
    Icon: LucideIcon;
    loading?: boolean;
    hint?: string;
}

const ACCENTS = {
    emerald: { ring: 'ring-emerald-200', icon: 'bg-emerald-100 text-emerald-700',  glow: 'from-emerald-400/20' },
    amber:   { ring: 'ring-amber-200',   icon: 'bg-amber-100 text-amber-700',      glow: 'from-amber-400/20' },
    indigo:  { ring: 'ring-indigo-200',  icon: 'bg-indigo-100 text-indigo-700',    glow: 'from-indigo-400/20' },
    rose:    { ring: 'ring-rose-200',    icon: 'bg-rose-100 text-rose-700',        glow: 'from-rose-400/20' },
    slate:   { ring: 'ring-slate-200',   icon: 'bg-slate-100 text-slate-700',      glow: 'from-slate-400/15' },
} as const;

/**
 * Tile compacta para KPIs. Diseñada para coexistir 2x2 en móvil y en línea en desktop.
 */
export function StatCard({ label, value, accent, Icon, loading, hint }: StatCardProps) {
    const a = ACCENTS[accent];
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl bg-white p-3 ring-1 transition-shadow hover:shadow-md sm:p-4',
                a.ring
            )}
        >
            <div className={cn('pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br to-transparent blur-2xl', a.glow)} aria-hidden />
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:text-xs">{label}</p>
                    {loading ? (
                        <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-100" />
                    ) : (
                        <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">{value}</p>
                    )}
                    {hint && !loading && (
                        <p className="mt-0.5 text-[10px] text-gray-400 sm:text-xs">{hint}</p>
                    )}
                </div>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9', a.icon)}>
                    <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
            </div>
        </div>
    );
}
