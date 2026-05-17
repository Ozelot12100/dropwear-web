export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Views: { [key: string]: never }
        CompositeTypes: { [key: string]: never }
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
                Relationships: []
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
                Relationships: []
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
                Relationships: [
                    {
                        foreignKeyName: 'inventory_items_product_id_fkey'
                        columns: ['product_id']
                        isOneToOne: false
                        referencedRelation: 'products'
                        referencedColumns: ['id']
                    },
                ]
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
                Relationships: [
                    {
                        foreignKeyName: 'inventory_logs_item_id_fkey'
                        columns: ['item_id']
                        isOneToOne: false
                        referencedRelation: 'inventory_items'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'inventory_logs_partner_id_fkey'
                        columns: ['partner_id']
                        isOneToOne: false
                        referencedRelation: 'user_profiles'
                        referencedColumns: ['id']
                    },
                ]
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
                Relationships: [
                    {
                        foreignKeyName: 'products_brand_id_fkey'
                        columns: ['brand_id']
                        isOneToOne: false
                        referencedRelation: 'brands'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'products_category_id_fkey'
                        columns: ['category_id']
                        isOneToOne: false
                        referencedRelation: 'categories'
                        referencedColumns: ['id']
                    },
                ]
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
                Relationships: []
            }
        }
        Enums: {
            item_status: 'disponible' | 'apartado' | 'vendido' | 'devuelto'
            log_action: 'creacion' | 'actualizacion_estado' | 'venta' | 'apartado' | 'devolucion'
            user_role: 'superadmin' | 'socio' | 'vendedor' | 'repartidor' | 'contador'
        }
        Functions: {
            change_item_status: {
                Args: {
                    p_item_id: number
                    p_expected_previous_status: Database['public']['Enums']['item_status']
                    p_new_status: Database['public']['Enums']['item_status']
                    p_price_sold?: number | null
                    p_notes?: string | null
                }
                Returns: {
                    item_id: number
                    previous_status: Database['public']['Enums']['item_status']
                    new_status: Database['public']['Enums']['item_status']
                    log_id: number
                }[]
            }
            add_inventory_item: {
                Args: {
                    p_product_id: number
                    p_size: string
                    p_color: string
                }
                Returns: {
                    item_id: number
                    log_id: number
                }[]
            }
        }
    }
}
