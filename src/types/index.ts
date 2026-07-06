export * from './database.types';

// Tipos auxiliares derivados para simplificar el código a lo largo del frontend
import type { Database } from './database.types';

export type UserRole = Database['public']['Enums']['user_role'];
export type ItemStatus = Database['public']['Enums']['item_status'];
export type LogAction = Database['public']['Enums']['log_action'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type CashCut = Database['public']['Tables']['cash_cuts']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
export type InventoryLog = Database['public']['Tables']['inventory_logs']['Row'];

/**
 * Shape real que devuelve inventoryService.getAllItems().
 * Incluye las relaciones anidadas resueltas por Supabase (products → brands, categories).
 * Usar este tipo en lugar de `any` en Dashboard y TransactionModal.
 */
export interface InventoryItemWithRelations extends InventoryItem {
    products: {
        id: number;
        name: string;
        base_price: number;
        image_url: string | null;
        brands: { name: string } | null;
        categories: { name: string } | null;
    } | null;
}

/**
 * Shape que devuelve dashboardService.getRecentActivity()
 */
export interface InventoryLogWithRelations extends InventoryLog {
    user_profiles: {
        full_name: string;
        role: UserRole;
    } | null;
    inventory_items: {
        size: string;
        color: string;
        price_sold: number | null;
        status: ItemStatus;
        products: { name: string } | null;
    } | null;
}
