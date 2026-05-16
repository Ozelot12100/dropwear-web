export * from './database.types';

// Tipos auxiliares derivados para simplificar el código a lo largo del frontend
import { Database } from './database.types';

export type UserRole = Database['public']['Enums']['user_role'];
export type ItemStatus = Database['public']['Enums']['item_status'];
export type LogAction = Database['public']['Enums']['log_action'];

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
