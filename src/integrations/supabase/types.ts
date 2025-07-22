export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          size_oz: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          size_oz: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          size_oz?: number
          created_at?: string
        }
        Relationships: []
      }
      formulas: {
        Row: {
          id: string
          product_id: string | null
          price_per_oz: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          price_per_oz: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          price_per_oz?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      packaging_options: {
        Row: {
          id: string
          product_id: string | null
          name: string
          price: number
          supplier: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          name: string
          price: number
          supplier?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          name?: string
          price?: number
          supplier?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      label_tiers: {
        Row: {
          id: string
          product_id: string | null
          min_quantity: number
          label_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          min_quantity: number
          label_cost: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          min_quantity?: number
          label_cost?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      manufacturing_tiers: {
        Row: {
          id: string
          product_id: string | null
          min_quantity: number
          fee_per_unit: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          min_quantity: number
          fee_per_unit: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          min_quantity?: number
          fee_per_unit?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      quotes: {
        Row: {
          id: string
          product_id: string | null
          quantity: number
          formula_cost: number | null
          packaging_cost: number | null
          label_cost: number | null
          manufacturing_fee: number | null
          total_unit_cost: number | null
          client_name: string | null
          client_email: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          quantity: number
          formula_cost?: number | null
          packaging_cost?: number | null
          label_cost?: number | null
          manufacturing_fee?: number | null
          total_unit_cost?: number | null
          client_name?: string | null
          client_email?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          quantity?: number
          formula_cost?: number | null
          packaging_cost?: number | null
          label_cost?: number | null
          manufacturing_fee?: number | null
          total_unit_cost?: number | null
          client_name?: string | null
          client_email?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
