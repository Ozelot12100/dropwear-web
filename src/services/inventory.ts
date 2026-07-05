import { supabase } from '../lib/supabase';
import type { ItemStatus, InventoryItemWithRelations } from '../types';

export const inventoryService = {
    /**
     * Obtiene todos los ítems del inventario con sus relaciones completas
     * (Producto, Marca y Categoría)
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
                created_at,
                products (
                    id,
                    name,
                    base_price,
                    image_url,
                    brands ( name ),
                    categories ( name )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data as any;
    },

    /**
     * Cambia el estado de un artículo (venta / apartado / devolución) de forma
     * ATÓMICA vía la función RPC `change_item_status`: bloquea la fila, actualiza
     * el ítem e inserta el log en una sola transacción de Postgres. Elimina la
     * doble venta y el estado inconsistente. El actor lo sella el servidor.
     */
    async updateItemStatus({
        itemId,
        newStatus,
        priceSold,
        notes,
    }: {
        itemId: number;
        newStatus: ItemStatus;
        priceSold: number | null;
        notes?: string;
    }) {
        const { error } = await supabase.rpc('change_item_status', {
            p_item_id: itemId,
            p_new_status: newStatus,
            p_price_sold: newStatus === 'vendido' ? (priceSold ?? undefined) : undefined,
            p_notes: notes?.trim() || undefined,
        });

        if (error) throw error;
        return true;
    },

    /**
     * Da de alta un artículo físico nuevo de forma atómica (item + log de
     * creación) vía la función RPC `add_inventory_item`. Por regla de negocio
     * el status inicial es 'disponible'.
     */
    async addItem({
        productId,
        size,
        color,
    }: {
        productId: number;
        size: string;
        color: string;
    }) {
        const { data, error } = await supabase.rpc('add_inventory_item', {
            p_product_id: productId,
            p_size: size,
            p_color: color,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Corrige los detalles físicos de un artículo (Producto, Talla, Color) de
     * forma atómica (update + log) vía la función RPC `update_item_details`.
     */
    async updateItemDetails({
        itemId,
        productId,
        size,
        color,
    }: {
        itemId: number;
        productId: number;
        size: string;
        color: string;
    }) {
        const { error } = await supabase.rpc('update_item_details', {
            p_item_id: itemId,
            p_product_id: productId,
            p_size: size,
            p_color: color,
        });

        if (error) throw error;
        return true;
    },
};
