import { supabase } from '../lib/supabase';
import type { Expense } from '../types';

// Categorías de gasto OPERATIVO (OPEX). NO incluye "compra de mercancía":
// el costo de la mercancía ya se captura por producto en products.cost (COGS)
// y contarlo también aquí lo restaría dos veces contra la utilidad.
export const EXPENSE_CATEGORIES = [
    { value: 'paqueteria', label: 'Paquetería', hint: 'Envíos y mensajería' },
    { value: 'servicios', label: 'Servicios', hint: 'Luz, agua, internet' },
    { value: 'nomina', label: 'Nómina', hint: 'Sueldos al personal' },
    { value: 'renta', label: 'Renta', hint: 'Local o bodega' },
    { value: 'limpieza', label: 'Limpieza', hint: 'Insumos y aseo' },
    { value: 'marketing', label: 'Marketing', hint: 'Publicidad y promoción' },
    { value: 'comisiones', label: 'Comisiones', hint: 'Terminal / plataformas de pago' },
    { value: 'otro', label: 'Otro', hint: 'Gastos varios' },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];

// Mapa value → etiqueta legible (para tablas, tarjetas y CSV).
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
);

// Shape que devuelve getExpenses(): el gasto + el nombre del autor incrustado.
export interface ExpenseWithUser extends Expense {
    user_profiles: { full_name: string } | null;
}

export interface MonthlyFinancials {
    revenue: number; // ingresos por ventas del mes
    cogs: number; // costo de la mercancía vendida (COGS)
    expenses: number; // gastos operativos del mes
    grossProfit: number; // revenue − cogs
    net: number; // grossProfit − expenses (utilidad neta real)
}

// Rango [inicio, fin) del mes dado (monthIndex 0-based) en fechas locales.
function monthRange(year: number, monthIndex: number) {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 1); // primer día del mes siguiente (exclusivo)
    const ymd = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: ymd(start), endDate: ymd(end), startISO: start.toISOString(), endISO: end.toISOString() };
}

export const expenseService = {
    // Gastos de un mes, más reciente primero. RLS ya restringe a roles financieros.
    async getExpenses(year: number, monthIndex: number): Promise<ExpenseWithUser[]> {
        const { startDate, endDate } = monthRange(year, monthIndex);
        const { data, error } = await supabase
            .from('expenses')
            .select('id, amount, category, description, spent_at, created_at, created_by, user_profiles ( full_name )')
            .gte('spent_at', startDate)
            .lt('spent_at', endDate)
            .order('spent_at', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as unknown as ExpenseWithUser[];
    },

    // Resumen financiero del mes: ingresos, costo de venta, gastos y utilidad neta.
    // El COGS usa el costo ACTUAL del producto (mismo criterio que el Dashboard).
    async getMonthlyFinancials(year: number, monthIndex: number): Promise<MonthlyFinancials> {
        const { startDate, endDate, startISO, endISO } = monthRange(year, monthIndex);

        // Ventas del mes (por bitácora), con el costo del producto para el COGS.
        const { data: sales, error: e1 } = await supabase
            .from('inventory_logs')
            .select('inventory_items ( price_sold, products ( cost ) )')
            .eq('action', 'venta')
            .gte('created_at', startISO)
            .lt('created_at', endISO);
        if (e1) throw e1;

        type SaleRow = {
            inventory_items: { price_sold: number | null; products: { cost: number | null } | null } | null;
        };
        const rows = (sales ?? []) as unknown as SaleRow[];
        const revenue = rows.reduce((a, r) => a + (Number(r.inventory_items?.price_sold) || 0), 0);
        const cogs = rows.reduce((a, r) => a + (Number(r.inventory_items?.products?.cost) || 0), 0);

        // Gastos operativos del mes.
        const { data: exp, error: e2 } = await supabase
            .from('expenses')
            .select('amount')
            .gte('spent_at', startDate)
            .lt('spent_at', endDate);
        if (e2) throw e2;
        const expenses = ((exp ?? []) as { amount: number }[]).reduce(
            (a, r) => a + (Number(r.amount) || 0),
            0,
        );

        const grossProfit = revenue - cogs;
        return { revenue, cogs, expenses, grossProfit, net: grossProfit - expenses };
    },

    async createExpense(payload: {
        amount: number;
        category: string;
        description?: string | null;
        spent_at: string;
    }): Promise<void> {
        // created_by lo sella el trigger stamp_expense_actor en el servidor.
        const { error } = await supabase.from('expenses').insert({
            amount: payload.amount,
            category: payload.category,
            description: payload.description?.trim() || null,
            spent_at: payload.spent_at,
        });
        if (error) throw error;
    },

    async updateExpense(
        id: number,
        payload: { amount: number; category: string; description?: string | null; spent_at: string },
    ): Promise<void> {
        const { error } = await supabase
            .from('expenses')
            .update({
                amount: payload.amount,
                category: payload.category,
                description: payload.description?.trim() || null,
                spent_at: payload.spent_at,
            })
            .eq('id', id);
        if (error) throw error;
    },

    async deleteExpense(id: number): Promise<void> {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
    },
};
