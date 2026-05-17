import { supabase } from '../lib/supabase';
import type { ItemStatus } from '../types';

export const inventoryService = {
    /**
     * Obtiene todos los ítems del inventario con sus relaciones completas
     * (Producto, Marca y Categoría)
     */
    async getAllItems() {
        const { data, error } = await supabase
            .from('inventory_items')
            // Inner Join implícito de Supabase:
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
          brands (name),
          categories (name)
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Ejecuta la transacción de cambio de estado de un ítem e inserta el log obligatorio.
     */
    async updateItemStatus({
        itemId,
        newStatus,
        priceSold,
        userId,
        notes,
    }: {
        itemId: number;
        newStatus: ItemStatus;
        priceSold: number | null;
        userId: string;
        notes?: string;
    }) {
        // 1. Obtener el estado previo para el log
        const { data: currentItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('status')
            .eq('id', itemId)
            .single();

        if (fetchError) throw fetchError;

        // TODO: En producción estricta esto se englobaría en un procedimiento almacenado (RPC)
        // en PostgreSQL para verdadera atomicidad, pero para el MVP lo resolvemos secuencialmente:

        // 2. Actualizar el estado del ítem
        const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
                status: newStatus,
                price_sold: newStatus === 'vendido' ? priceSold : null,
                updated_by: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);

        if (updateError) throw updateError;

        // 3. Registrar de forma inmutable el evento transaccional
        let actionType: any = 'actualizacion_estado';
        if (newStatus === 'vendido') actionType = 'venta';
        else if (newStatus === 'apartado') actionType = 'apartado';
        else if (newStatus === 'devuelto') actionType = 'devolucion';

        const { error: logError } = await supabase
            .from('inventory_logs')
            .insert({
                item_id: itemId,
                partner_id: userId,
                action: actionType,
                previous_status: currentItem.status,
                new_status: newStatus,
                notes: notes || null,
            });

        if (logError) {
            console.error('Error al insertar el log:', logError);
            // El ítem se actualizó pero el log falló. 
            throw new Error("Ítem actualizado, pero falló el registro en la bitácora.");
        }

        return true;
    },

    /**
     * Da de alta un artículo físico nuevo en el inventario.
     * Por regla de negocio: status por defecto es 'disponible'.
     * Siempre inserta el log de auditoría con action = 'creacion'.
     */
    async addItem({
        productId,
        size,
        color,
        userId,
    }: {
        productId: number;
        size: string;
        color: string;
        userId: string;
    }) {
        // 1. Insertar el ítem físico (status 'disponible' por default del esquema)
        const { data: newItem, error: insertError } = await supabase
            .from('inventory_items')
            .insert({
                product_id: productId,
                size: size.trim().toUpperCase(),
                color: color.trim().toLowerCase(),
                updated_by: userId,
            })
            .select('id')
            .single();

        if (insertError) throw insertError;

        // 2. Registrar el evento de creación en la bitácora (inmutable)
        const { error: logError } = await supabase
            .from('inventory_logs')
            .insert({
                item_id: newItem.id,
                partner_id: userId,
                action: 'creacion',
                previous_status: null,
                new_status: 'disponible',
                notes: null,
            });

        if (logError) {
            console.error('Error al registrar log de creación:', logError);
            throw new Error('Prenda agregada, pero falló el registro en la bitácora.');
        }

        return newItem;
    },
};

