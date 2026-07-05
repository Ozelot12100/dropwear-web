import { supabase } from '../lib/supabase';
import type { InventoryLogWithRelations } from '../types';

export const dashboardService = {
    async getDashboardStats() {
        // Today's date starting at midnight local time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Total disponibles
        const { count: availableCount, error: err1 } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'disponible');
            
        if (err1) throw err1;

        // Total apartados
        const { count: reservedCount, error: err2 } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'apartado');
            
        if (err2) throw err2;

        // Vendidos hoy: se derivan de la BITÁCORA (eventos 'venta' de hoy), no de
        // `updated_at` del artículo —que se bumpea al editar detalles e inflaba las
        // ventas del día. Cada log de venta es un evento real; el monto sale del
        // precio del artículo vinculado.
        const { data: salesToday, error: err3 } = await supabase
            .from('inventory_logs')
            .select('inventory_items ( price_sold )')
            .eq('action', 'venta')
            .gte('created_at', todayISO);

        if (err3) throw err3;

        type SaleRow = { inventory_items: { price_sold: number | null } | null };
        const rows = (salesToday ?? []) as unknown as SaleRow[];
        const soldCount = rows.length;
        const totalRevenue = rows.reduce(
            (acc, row) => acc + (Number(row.inventory_items?.price_sold) || 0),
            0,
        );

        return {
            availableCount: availableCount || 0,
            reservedCount: reservedCount || 0,
            soldCount,
            totalRevenue,
        };
    },

    async getRecentActivity() {
        const { data, error } = await supabase
            .from('inventory_logs')
            .select(`
                *,
                user_profiles ( full_name, role ),
                inventory_items ( 
                    size, color, price_sold, status,
                    products ( name )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        return data as unknown as InventoryLogWithRelations[];
    }
};
