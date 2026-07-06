export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          color: string
          created_at: string | null
          id: number
          price_sold: number | null
          product_id: number
          reserved_contact: string | null
          reserved_deposit: number | null
          reserved_for: string | null
          reserved_until: string | null
          size: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: never
          price_sold?: number | null
          product_id: number
          reserved_contact?: string | null
          reserved_deposit?: number | null
          reserved_for?: string | null
          reserved_until?: string | null
          size: string
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: never
          price_sold?: number | null
          product_id?: number
          reserved_contact?: string | null
          reserved_deposit?: number | null
          reserved_for?: string | null
          reserved_until?: string | null
          size?: string
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          action: Database["public"]["Enums"]["log_action"]
          created_at: string | null
          id: number
          item_id: number
          new_status: Database["public"]["Enums"]["item_status"] | null
          notes: string | null
          partner_id: string | null
          previous_status: Database["public"]["Enums"]["item_status"] | null
        }
        Insert: {
          action: Database["public"]["Enums"]["log_action"]
          created_at?: string | null
          id?: never
          item_id: number
          new_status?: Database["public"]["Enums"]["item_status"] | null
          notes?: string | null
          partner_id?: string | null
          previous_status?: Database["public"]["Enums"]["item_status"] | null
        }
        Update: {
          action?: Database["public"]["Enums"]["log_action"]
          created_at?: string | null
          id?: never
          item_id?: number
          new_status?: Database["public"]["Enums"]["item_status"] | null
          notes?: string | null
          partner_id?: string | null
          previous_status?: Database["public"]["Enums"]["item_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand_id: number
          category_id: number
          cost: number | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          base_price?: number
          brand_id: number
          category_id: number
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          image_url?: string | null
          name: string
        }
        Update: {
          base_price?: number
          brand_id?: number
          category_id?: number
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          image_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_inventory_item: {
        Args: { p_color: string; p_product_id: number; p_size: string }
        Returns: {
          color: string
          created_at: string | null
          id: number
          price_sold: number | null
          product_id: number
          reserved_contact: string | null
          reserved_deposit: number | null
          reserved_for: string | null
          reserved_until: string | null
          size: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_item_status: {
        Args: {
          p_item_id: number
          p_new_status: Database["public"]["Enums"]["item_status"]
          p_notes?: string
          p_price_sold?: number
          p_reserved_contact?: string
          p_reserved_deposit?: number
          p_reserved_for?: string
          p_reserved_until?: string
        }
        Returns: {
          color: string
          created_at: string | null
          id: number
          price_sold: number | null
          product_id: number
          reserved_contact: string | null
          reserved_deposit: number | null
          reserved_for: string | null
          reserved_until: string | null
          size: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_item_details: {
        Args: {
          p_color: string
          p_item_id: number
          p_product_id: number
          p_size: string
        }
        Returns: {
          color: string
          created_at: string | null
          id: number
          price_sold: number | null
          product_id: number
          reserved_contact: string | null
          reserved_deposit: number | null
          reserved_for: string | null
          reserved_until: string | null
          size: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string | null
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventory_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      item_status: "disponible" | "apartado" | "vendido" | "devuelto"
      log_action:
        | "creacion"
        | "actualizacion_estado"
        | "venta"
        | "apartado"
        | "devolucion"
      user_role: "superadmin" | "socio" | "vendedor" | "repartidor" | "contador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_status: ["disponible", "apartado", "vendido", "devuelto"],
      log_action: [
        "creacion",
        "actualizacion_estado",
        "venta",
        "apartado",
        "devolucion",
      ],
      user_role: ["superadmin", "socio", "vendedor", "repartidor", "contador"],
    },
  },
} as const
