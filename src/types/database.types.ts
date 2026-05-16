export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            brands: {
                Row: {
                    id: number
                    name: string
                    created_at: string | null
                }
                Insert: {
                    id?: never
                    name: string
                    created_at?: string | null
                }
                Update: {
                    id?: never
                    name?: string
                    created_at?: string | null
                }
            }
            categories: {
                Row: {
                    id: number
                    name: string
                    created_at: string | null
                }
                Insert: {
                    id?: never
                    name: string
                    created_at?: string | null
                }
                Update: {
                    id?: never
                    name?: string
                    created_at?: string | null
                }
            }
            inventory_items: {
                Row: {
                    id: number
                    product_id: number
                    size: string
                    color: string
                    status: Database['public']['Enums']['item_status']
                    price_sold: number | null
                    updated_by: string | null
                    updated_at: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: never
                    product_id: number
                    size: string
                    color: string
                    status?: Database['public']['Enums']['item_status']
                    price_sold?: number | null
                    updated_by?: string | null
                    updated_at?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: never
                    product_id?: number
                    size?: string
                    color?: string
                    status?: Database['public']['Enums']['item_status']
                    price_sold?: number | null
                    updated_by?: string | null
                    updated_at?: string | null
                    created_at?: string | null
                }
            }
            inventory_logs: {
                Row: {
                    id: number
                    item_id: number
                    partner_id: string | null
                    action: Database['public']['Enums']['log_action']
                    previous_status: Database['public']['Enums']['item_status'] | null
                    new_status: Database['public']['Enums']['item_status'] | null
                    notes: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: never
                    item_id: number
                    partner_id?: string | null
                    action: Database['public']['Enums']['log_action']
                    previous_status?: Database['public']['Enums']['item_status'] | null
                    new_status?: Database['public']['Enums']['item_status'] | null
                    notes?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: never
                    item_id?: number
                    partner_id?: string | null
                    action?: Database['public']['Enums']['log_action']
                    previous_status?: Database['public']['Enums']['item_status'] | null
                    new_status?: Database['public']['Enums']['item_status'] | null
                    notes?: string | null
                    created_at?: string | null
                }
            }
            products: {
                Row: {
                    id: number
                    brand_id: number
                    category_id: number
                    name: string
                    description: string | null
                    base_price: number
                    created_at: string | null
                }
                Insert: {
                    id?: never
                    brand_id: number
                    category_id: number
                    name: string
                    description?: string | null
                    base_price?: number
                    created_at?: string | null
                }
                Update: {
                    id?: never
                    brand_id?: number
                    category_id?: number
                    name?: string
                    description?: string | null
                    base_price?: number
                    created_at?: string | null
                }
            }
            user_profiles: {
                Row: {
                    id: string
                    full_name: string
                    role: Database['public']['Enums']['user_role']
                    created_at: string | null
                }
                Insert: {
                    id: string
                    full_name: string
                    role?: Database['public']['Enums']['user_role']
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    full_name?: string
                    role?: Database['public']['Enums']['user_role']
                    created_at?: string | null
                }
            }
        }
        Enums: {
            item_status: 'disponible' | 'apartado' | 'vendido' | 'devuelto'
            log_action: 'creacion' | 'actualizacion_estado' | 'venta' | 'apartado' | 'devolucion'
            user_role: 'superadmin' | 'socio' | 'vendedor' | 'repartidor' | 'contador'
        }
    }
}
