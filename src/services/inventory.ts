import { supabase } from '../lib/supabase';
import type { Database, ItemStatus, InventoryItemWithRelations } from '../types';

type ChangeItemStatusArgs = Database['public']['Functions']['change_item_status']['Args'];
type AddInventoryItemArgs = Database['public']['Functions']['add_inventory_item']['Args'];

/**
 * Servicio de inventario. Las operaciones de escritura usan funciones SQL
 * (RPC) que ejecutan UPDATE + log + validación en una sola transacción con
 * bloqueo optimista para evitar pérdidas de actualización en operación
 * concurrente.
 *
 * Requiere la migración: supabase/migrations/20260516120000_optimistic_locking.sql
 */

interface ChangeStatusResult {
    item_id: number;
    previous_status: ItemStatus;
    new_status: ItemStatus;
    log_id: number;
}

interface AddItemResult {
    item_id: number;
    log_id: number;
}

export const inventoryService = {
    /**
     * Listado completo del inventario con relaciones (producto → marca → categoría).
     */
    async getAllItems(): Promise<InventoryItemWithRelations[]> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select(`
                id,
                size,
                color,
                status,
                price_sold,
                updated_by,
                updated_at,
                created_at,
                product_id,
                products (
                    id,
                    name,
                    base_price,
                    brands ( name ),
                    categories ( name )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data ?? []) as unknown as InventoryItemWithRelations[];
    },

    /**
     * Obtiene un único ítem (útil para refresco granular post-realtime).
     */
    async getItemById(id: number): Promise<InventoryItemWithRelations | null> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select(`
                id,
                size,
                color,
                status,
                price_sold,
                updated_by,
                updated_at,
                created_at,
                product_id,
                products (
                    id,
                    name,
                    base_price,
                    brands ( name ),
                    categories ( name )
                )
            `)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return (data as unknown as InventoryItemWithRelations) ?? null;
    },

    /**
     * Cambio de estado ATÓMICO con bloqueo optimista.
     *
     * @throws Error('STALE_STATE:...') si otro usuario modificó la prenda primero.
     * @throws Error('INVALID_PRICE:...') si se vende sin precio.
     * @throws Error('ITEM_NOT_FOUND:...') si la prenda fue eliminada.
     */
    async updateItemStatus(args: {
        itemId: number;
        expectedPreviousStatus: ItemStatus;
        newStatus: ItemStatus;
        priceSold: number | null;
        notes?: string;
    }): Promise<ChangeStatusResult> {
        const rpcArgs: ChangeItemStatusArgs = {
            p_item_id: args.itemId,
            p_expected_previous_status: args.expectedPreviousStatus,
            p_new_status: args.newStatus,
            p_price_sold: args.priceSold,
            p_notes: args.notes ?? null,
        };
        const { data, error } = await supabase.rpc('change_item_status', rpcArgs);

        if (error) {
            // La función SQL lanza `STALE_STATE: ...`, `INVALID_PRICE: ...`, etc.
            // Re-lanzamos con el mismo prefijo para que el parser de errores lo capture.
            throw new Error(error.message);
        }

        // Postgres devuelve `RETURNS TABLE` como arreglo; tomamos la primera fila.
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('No se recibió respuesta del servidor.');
        return row as ChangeStatusResult;
    },

    /**
     * Alta de prenda física + log de creación, atómico.
     */
    async addItem(args: {
        productId: number;
        size: string;
        color: string;
    }): Promise<AddItemResult> {
        const rpcArgs: AddInventoryItemArgs = {
            p_product_id: args.productId,
            p_size: args.size,
            p_color: args.color,
        };
        const { data, error } = await supabase.rpc('add_inventory_item', rpcArgs);

        if (error) throw new Error(error.message);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('No se recibió respuesta del servidor.');
        return row as AddItemResult;
    },
};
