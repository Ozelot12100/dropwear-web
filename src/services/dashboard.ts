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

        // Vendidos hoy
        const { data: soldToday, error: err3 } = await supabase
            .from('inventory_items')
            .select('price_sold')
            .eq('status', 'vendido')
            .gte('updated_at', todayISO);
            
        if (err3) throw err3;

        const soldCount = soldToday.length;
        const totalRevenue = soldToday.reduce((acc, item) => {
            const price = Number((item as { price_sold: number | null }).price_sold) || 0;
            return acc + price;
        }, 0);

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
