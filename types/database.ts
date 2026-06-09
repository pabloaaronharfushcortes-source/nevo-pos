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
      appointments: {
        Row: {
          barber_id: string
          booked_via: string
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          service_id: string
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          barber_id: string
          booked_via?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          service_id: string
          starts_at: string
          status?: string
          tenant_id: string
        }
        Update: {
          barber_id?: string
          booked_via?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          service_id?: string
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_schedules: {
        Row: {
          barber_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          barber_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          barber_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_time_off: {
        Row: {
          barber_id: string
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
          tenant_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
          tenant_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_time_off_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_time_off_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          bio: string | null
          commission_rate: number
          created_at: string
          email: string | null
          hired_at: string | null
          id: string
          instagram: string | null
          is_active: boolean
          name: string
          phone: string | null
          photo_url: string | null
          sort_order: number
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          hired_at?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          hired_at?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          cashier_id: string
          closed_at: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          tenant_id: string
        }
        Insert: {
          cashier_id: string
          closed_at?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount: number
          tenant_id: string
        }
        Update: {
          cashier_id?: string
          closed_at?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          classification: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          last_visit_at: string | null
          loyalty_stamps: number
          name: string
          notes: string | null
          phone: string | null
          preferred_barber_id: string | null
          tenant_id: string
          total_spent: number
          whatsapp_id: string | null
        }
        Insert: {
          classification?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_stamps?: number
          name: string
          notes?: string | null
          phone?: string | null
          preferred_barber_id?: string | null
          tenant_id: string
          total_spent?: number
          whatsapp_id?: string | null
        }
        Update: {
          classification?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_stamps?: number
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_barber_id?: string | null
          tenant_id?: string
          total_spent?: number
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_preferred_barber_id_fkey"
            columns: ["preferred_barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          barber_id: string
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          rate: number
          sale_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          barber_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          rate: number
          sale_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          barber_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          rate?: number
          sale_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          mode: string
          tenant_id: string
          unread_human_count: number
          whatsapp_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          mode?: string
          tenant_id: string
          unread_human_count?: number
          whatsapp_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          mode?: string
          tenant_id?: string
          unread_human_count?: number
          whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_url: string | null
          sent_by: string
          type: string
          whatsapp_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_url?: string | null
          sent_by: string
          type: string
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          sent_by?: string
          type?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sku: string | null
          stock_minimum: number
          stock_quantity: number
          tenant_id: string
          unit: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          sku?: string | null
          stock_minimum?: number
          stock_quantity?: number
          tenant_id: string
          unit?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          stock_minimum?: number
          stock_quantity?: number
          tenant_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tickets: {
        Row: {
          barber_id: string
          client_id: string | null
          created_at: string
          estimated_start_at: string
          id: string
          service_id: string | null
          source: string
          status: string
          tenant_id: string
          ticket_number: number
        }
        Insert: {
          barber_id: string
          client_id?: string | null
          created_at?: string
          estimated_start_at: string
          id?: string
          service_id?: string | null
          source?: string
          status?: string
          tenant_id: string
          ticket_number: number
        }
        Update: {
          barber_id?: string
          client_id?: string | null
          created_at?: string
          estimated_start_at?: string
          id?: string
          service_id?: string | null
          source?: string
          status?: string
          tenant_id?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "queue_tickets_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          name: string
          price: number
          product_id: string | null
          quantity: number
          sale_id: string
          service_id: string | null
          subtotal: number
          type: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          product_id?: string | null
          quantity?: number
          sale_id: string
          service_id?: string | null
          subtotal: number
          type: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string
          service_id?: string | null
          subtotal?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          appointment_id: string | null
          barber_id: string
          cash_register_id: string | null
          cashier_id: string
          client_id: string | null
          created_at: string
          deleted_at: string | null
          discount: number
          id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          queue_ticket_id: string | null
          subtotal: number
          tenant_id: string
          tip: number
          total: number
        }
        Insert: {
          appointment_id?: string | null
          barber_id: string
          cash_register_id?: string | null
          cashier_id: string
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          queue_ticket_id?: string | null
          subtotal: number
          tenant_id: string
          tip?: number
          total: number
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string
          cash_register_id?: string | null
          cashier_id?: string
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          queue_ticket_id?: string | null
          subtotal?: number
          tenant_id?: string
          tip?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_queue_ticket_id_fkey"
            columns: ["queue_ticket_id"]
            isOneToOne: false
            referencedRelation: "queue_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          agent_knowledge_base: string | null
          appointment_buffer_minutes: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          late_tolerance_minutes: number
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          timezone: string
          website: string | null
          whatsapp_access_token: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_verify_token: string | null
        }
        Insert: {
          address?: string | null
          agent_knowledge_base?: string | null
          appointment_buffer_minutes?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          late_tolerance_minutes?: number
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          timezone?: string
          website?: string | null
          whatsapp_access_token?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_verify_token?: string | null
        }
        Update: {
          address?: string | null
          agent_knowledge_base?: string | null
          appointment_buffer_minutes?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          late_tolerance_minutes?: number
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          timezone?: string
          website?: string | null
          whatsapp_access_token?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_verify_token?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          role: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
