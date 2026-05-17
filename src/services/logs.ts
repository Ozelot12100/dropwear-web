import { supabase } from '../lib/supabase';
import type { LogAction, ItemStatus } from '../types';

export interface LogWithRelations {
    id: number;
    action: LogAction;
    previous_status: ItemStatus | null;
    new_status: ItemStatus | null;
    notes: string | null;
    created_at: string | null;
    partner_id: string | null;
    // Relaciones resueltas
    inventory_items: {
        id: number;
        size: string;
        color: string;
        price_sold: number | null; // ← campo financiero del ítem (solo visible para roles autorizados)
        products: {
            name: string;
            brands: { name: string } | null;
        } | null;
    } | null;
    user_profiles: {
        full_name: string;
    } | null;
}

export const logsService = {
    /**
     * Obtiene el historial completo de operaciones con todas sus relaciones.
     * JOIN: inventory_logs → inventory_items (incl. price_sold) → products → brands
     *       inventory_logs → user_profiles (via partner_id)
     */
    async getLogs(): Promise<LogWithRelations[]> {
        const { data, error } = await supabase
            .from('inventory_logs')
            .select(`
                id,
                action,
                previous_status,
                new_status,
                notes,
                created_at,
                partner_id,
                inventory_items (
                    id,
                    size,
                    color,
                    price_sold,
                    products (
                        name,
                        brands ( name )
                    )
                ),
                user_profiles (
                    full_name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;
        return data as LogWithRelations[];
    },
};
