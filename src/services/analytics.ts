import { supabase } from '../lib/supabase';

export interface MonthPoint {
    key: string; // 'YYYY-MM'
    label: string; // 'Jul'
    revenue: number; // ingresos por ventas del mes
    net: number; // utilidad neta = ingresos − COGS − gastos
}

export interface TopProduct {
    name: string;
    units: number;
    revenue: number;
}

export interface BusinessAnalytics {
    months: MonthPoint[];
    topProducts: TopProduct[]; // del mes en curso
    currentLabel: string; // etiqueta del mes en curso (para el encabezado)
}

// Analítica del negocio para el Dashboard: tendencia de N meses (ingresos y
// utilidad neta) + top de productos del mes en curso. Todo se deriva de la
// bitácora de ventas (`inventory_logs`) y de `expenses`. El COGS usa el costo
// ACTUAL del producto (mismo criterio que el resumen de Gastos y el Dashboard).
export const analyticsService = {
    async getBusinessAnalytics(monthsBack = 6): Promise<BusinessAnalytics> {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
        const startISO = start.toISOString();
        const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
        const monthFmt = new Intl.DateTimeFormat('es-MX', { month: 'short' });

        // Cubetas de mes (más antiguo → más reciente), inicializadas en cero.
        const buckets = new Map<string, { label: string; revenue: number; cogs: number; expenses: number }>();
        const order: string[] = [];
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const raw = monthFmt.format(d).replace('.', '');
            buckets.set(key, { label: raw.charAt(0).toUpperCase() + raw.slice(1), revenue: 0, cogs: 0, expenses: 0 });
            order.push(key);
        }
        const currentKey = order[order.length - 1] ?? '';

        // Ventas del rango, con nombre y costo del producto.
        const { data: sales, error: e1 } = await supabase
            .from('inventory_logs')
            .select('created_at, inventory_items ( price_sold, products ( name, cost ) )')
            .eq('action', 'venta')
            .gte('created_at', startISO);
        if (e1) throw e1;

        type SaleRow = {
            created_at: string;
            inventory_items: { price_sold: number | null; products: { name: string | null; cost: number | null } | null } | null;
        };
        const rows = (sales ?? []) as unknown as SaleRow[];

        // Acumular ventas por mes + agrupar top productos del mes en curso.
        const topMap = new Map<string, { units: number; revenue: number }>();
        for (const r of rows) {
            const dt = new Date(r.created_at);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            const bucket = buckets.get(key);
            if (!bucket) continue;
            const price = Number(r.inventory_items?.price_sold) || 0;
            const cost = Number(r.inventory_items?.products?.cost) || 0;
            bucket.revenue += price;
            bucket.cogs += cost;
            if (key === currentKey) {
                const name = r.inventory_items?.products?.name || 'Producto desconocido';
                const acc = topMap.get(name) ?? { units: 0, revenue: 0 };
                acc.units += 1;
                acc.revenue += price;
                topMap.set(name, acc);
            }
        }

        // Gastos del rango (por mes).
        const { data: exp, error: e2 } = await supabase
            .from('expenses')
            .select('amount, spent_at')
            .gte('spent_at', startDate);
        if (e2) throw e2;
        for (const r of (exp ?? []) as { amount: number; spent_at: string }[]) {
            const key = r.spent_at.slice(0, 7);
            const bucket = buckets.get(key);
            if (bucket) bucket.expenses += Number(r.amount) || 0;
        }

        const months: MonthPoint[] = order.map((key) => {
            const b = buckets.get(key)!;
            return { key, label: b.label, revenue: b.revenue, net: b.revenue - b.cogs - b.expenses };
        });

        const topProducts: TopProduct[] = [...topMap.entries()]
            .map(([name, v]) => ({ name, units: v.units, revenue: v.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const curFmt = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(now);

        return { months, topProducts, currentLabel: curFmt.charAt(0).toUpperCase() + curFmt.slice(1) };
    },
};
