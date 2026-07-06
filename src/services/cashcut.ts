import { supabase } from '../lib/supabase';
import type { CashCut } from '../types';

// Desglose de ventas de un día por método de pago.
export interface DaySales {
    efectivo: number;
    transferencia: number;
    tarjeta: number;
    total: number;
    count: number;
}

export interface CashCutWithUser extends CashCut {
    user_profiles: { full_name: string } | null;
}

export const cashCutService = {
    // Ventas de un día (fecha local 'YYYY-MM-DD') por método de pago, derivadas
    // de la bitácora de ventas + el artículo vendido (price_sold, payment_method).
    async getDaySales(dateStr: string): Promise<DaySales> {
        const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number);
        const start = new Date(y, m - 1, d);
        const end = new Date(y, m - 1, d + 1);

        const { data, error } = await supabase
            .from('inventory_logs')
            .select('inventory_items ( price_sold, payment_method )')
            .eq('action', 'venta')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
        if (error) throw error;

        type Row = { inventory_items: { price_sold: number | null; payment_method: string | null } | null };
        const rows = (data ?? []) as unknown as Row[];
        const acc: DaySales = { efectivo: 0, transferencia: 0, tarjeta: 0, total: 0, count: 0 };
        for (const r of rows) {
            const amt = Number(r.inventory_items?.price_sold) || 0;
            const method = r.inventory_items?.payment_method ?? 'efectivo';
            acc.total += amt;
            acc.count += 1;
            if (method === 'transferencia') acc.transferencia += amt;
            else if (method === 'tarjeta') acc.tarjeta += amt;
            else acc.efectivo += amt;
        }
        return acc;
    },

    async getCashCuts(): Promise<CashCutWithUser[]> {
        const { data, error } = await supabase
            .from('cash_cuts')
            .select('id, cut_date, opening_float, sales_cash, expected_cash, counted_cash, difference, notes, created_by, created_at, user_profiles ( full_name )')
            .order('cut_date', { ascending: false })
            .order('id', { ascending: false })
            .limit(30);
        if (error) throw error;
        return data as unknown as CashCutWithUser[];
    },

    async createCashCut(payload: {
        cut_date: string;
        opening_float: number;
        sales_cash: number;
        expected_cash: number;
        counted_cash: number;
        difference: number;
        notes?: string | null;
    }): Promise<void> {
        // created_by lo sella el trigger stamp_cash_cut_actor.
        const { error } = await supabase.from('cash_cuts').insert({
            cut_date: payload.cut_date,
            opening_float: payload.opening_float,
            sales_cash: payload.sales_cash,
            expected_cash: payload.expected_cash,
            counted_cash: payload.counted_cash,
            difference: payload.difference,
            notes: payload.notes?.trim() || null,
        });
        if (error) throw error;
    },
};
