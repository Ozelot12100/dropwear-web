import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventory';
import type { InventoryItem, InventoryItemWithRelations } from '../types';

export type RealtimeStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface RealtimeActivity {
    id: number;
    kind: 'insert' | 'update' | 'delete';
    at: number;
}

/**
 * Mantiene la caché de React Query de `inventory_items` sincronizada en tiempo real
 * sin invalidaciones masivas (refetch). En cada cambio:
 *
 *   - INSERT: fetch del nuevo ítem (necesitamos los joins) y lo agregamos al inicio.
 *   - UPDATE: aplicamos el cambio de columnas escalares directamente sobre la caché
 *             (preservando los joins de products/brands/categories que no llegan
 *             en el payload de Postgres).
 *   - DELETE: filtramos del arreglo.
 *
 * Esto evita el "parpadeo" de invalidar todo el listado y reduce la carga al API.
 * Adicionalmente expone el estado del canal (live/reconnecting/offline) y la última
 * actividad observada para feedback visual.
 */
export function useInventoryRealtime() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<RealtimeStatus>('connecting');
    const [lastActivity, setLastActivity] = useState<RealtimeActivity | null>(null);
    const seenRef = useRef<Set<number>>(new Set()); // dedupe rápido por id+ts

    useEffect(() => {
        const channel = supabase
            .channel('inventory-items-stream', { config: { broadcast: { ack: false } } })
            .on<InventoryItem>(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'inventory_items' },
                async (payload: RealtimePostgresChangesPayload<InventoryItem>) => {
                    const key = ['inventory_items'] as const;

                    if (payload.eventType === 'INSERT') {
                        const row = payload.new as InventoryItem;
                        // Necesitamos los joins, así que refetcheamos sólo ese registro
                        try {
                            const full = await inventoryService.getItemById(row.id);
                            if (!full) return;
                            queryClient.setQueryData<InventoryItemWithRelations[]>(key, prev => {
                                if (!prev) return [full];
                                if (prev.some(p => p.id === full.id)) return prev;
                                return [full, ...prev];
                            });
                            setLastActivity({ id: full.id, kind: 'insert', at: Date.now() });
                        } catch {
                            // fallback: invalidamos
                            queryClient.invalidateQueries({ queryKey: key });
                        }
                        return;
                    }

                    if (payload.eventType === 'UPDATE') {
                        const row = payload.new as InventoryItem;
                        queryClient.setQueryData<InventoryItemWithRelations[]>(key, prev => {
                            if (!prev) return prev;
                            return prev.map(item =>
                                item.id === row.id
                                    ? { ...item, ...row, products: item.products }
                                    : item
                            );
                        });
                        // Refrescamos también la bitácora porque cualquier cambio dispara un log
                        queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
                        setLastActivity({ id: row.id, kind: 'update', at: Date.now() });
                        return;
                    }

                    if (payload.eventType === 'DELETE') {
                        const row = payload.old as InventoryItem;
                        queryClient.setQueryData<InventoryItemWithRelations[]>(key, prev => {
                            if (!prev) return prev;
                            return prev.filter(item => item.id !== row.id);
                        });
                        setLastActivity({ id: row.id, kind: 'delete', at: Date.now() });
                    }
                }
            )
            .subscribe((channelStatus) => {
                if (channelStatus === 'SUBSCRIBED') setStatus('live');
                else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') setStatus('reconnecting');
                else if (channelStatus === 'CLOSED') setStatus('offline');
            });

        // Suscripción a logs para que la página de bitácora refresque en tiempo real
        const logsChannel = supabase
            .channel('inventory-logs-stream')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_logs' }, () => {
                queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(logsChannel);
            seenRef.current.clear();
        };
    }, [queryClient]);

    return { status, lastActivity };
}
