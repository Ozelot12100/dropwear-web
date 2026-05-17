import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealtimeStatus } from '@/hooks/useInventoryRealtime';

const META: Record<RealtimeStatus, { label: string; dot: string; ring: string; Icon: typeof Wifi }> = {
    live:         { label: 'En vivo',      dot: 'bg-emerald-500',  ring: 'ring-emerald-500/30', Icon: Wifi },
    connecting:   { label: 'Conectando',   dot: 'bg-amber-500',    ring: 'ring-amber-500/30',   Icon: Loader2 },
    reconnecting: { label: 'Reconectando', dot: 'bg-amber-500',    ring: 'ring-amber-500/30',   Icon: Loader2 },
    offline:      { label: 'Sin conexión', dot: 'bg-rose-500',     ring: 'ring-rose-500/30',    Icon: WifiOff },
};

/**
 * Píldora compacta con el estado del canal de realtime. Pulsa cuando está vivo.
 */
export function LiveBadge({ status, className }: { status: RealtimeStatus; className?: string }) {
    const meta = META[status];
    const isAnimating = status === 'connecting' || status === 'reconnecting';

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-700 ring-1 backdrop-blur-sm',
                meta.ring,
                className
            )}
            title={`Realtime: ${meta.label}`}
        >
            <span className="relative flex h-2 w-2">
                {status === 'live' && (
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', meta.dot)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dot)} />
            </span>
            <span className="hidden sm:inline">{meta.label}</span>
            {isAnimating && <meta.Icon className="h-3 w-3 animate-spin sm:hidden" />}
        </div>
    );
}
