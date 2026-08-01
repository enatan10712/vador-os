export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          metadata?: Json | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          tenant_slug: string;
          role: Database['public']['Enums']['user_role'];
          full_name: string | null;
          email: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_slug: string;
          role: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          email?: string | null;
          created_at?: string | null;
        };
        Update: {
          tenant_slug?: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          email?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_slug: string;
          customer_id: string | null;
          table_number: string;
          total_amount: number;
          status: Database['public']['Enums']['order_status'];
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          customer_id?: string | null;
          table_number: string;
          total_amount: number;
          status?: Database['public']['Enums']['order_status'];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          table_number?: string;
          total_amount?: number;
          status?: Database['public']['Enums']['order_status'];
          notes?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          name: string;
          quantity: number;
          price: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          name: string;
          quantity: number;
          price: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          quantity?: number;
          price?: number;
          metadata?: Json | null;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          tenant_slug: string;
          name: string;
          sku: string;
          quantity: number;
          unit: string;
          threshold: number;
          status: Database['public']['Enums']['stock_status'];
          metadata: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          name: string;
          sku: string;
          quantity: number;
          unit: string;
          threshold: number;
          status: Database['public']['Enums']['stock_status'];
          metadata?: Json | null;
          updated_at?: string;
        };
        Update: {
          quantity?: number;
          threshold?: number;
          status?: Database['public']['Enums']['stock_status'];
          metadata?: Json | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          tenant_slug: string;
          title: string;
          description: string;
          type: Database['public']['Enums']['notification_type'];
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          title: string;
          description: string;
          type: Database['public']['Enums']['notification_type'];
          read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          type?: Database['public']['Enums']['notification_type'];
          read?: boolean;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_slug: string;
          user_id: string | null;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          user_id?: string | null;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          details?: Json | null;
        };
      };
      locations: {
        Row: {
          id: string;
          tenant_slug: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          timezone: string;
          operating_hours: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          timezone?: string;
          operating_hours?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          timezone?: string;
          operating_hours?: Json | null;
          is_active?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          tenant_slug: string;
          location_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          location_id?: string | null;
          name: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          location_id?: string | null;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      menu_items: {
        Row: {
          id: string;
          tenant_slug: string;
          category_id: string | null;
          name: string;
          description: string | null;
          base_price: number;
          image_url: string | null;
          tags: string[] | null;
          sku: string | null;
          allergens: string[] | null;
          nutritional_info: Json | null;
          is_active: boolean;
          availability: Json | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          base_price: number;
          image_url?: string | null;
          tags?: string[] | null;
          sku?: string | null;
          allergens?: string[] | null;
          nutritional_info?: Json | null;
          is_active?: boolean;
          availability?: Json | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          category_id?: string | null;
          name?: string;
          description?: string | null;
          base_price?: number;
          image_url?: string | null;
          tags?: string[] | null;
          sku?: string | null;
          allergens?: string[] | null;
          nutritional_info?: Json | null;
          is_active?: boolean;
          availability?: Json | null;
          sort_order?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      menu_variants: {
        Row: {
          id: string;
          tenant_slug: string;
          menu_item_id: string;
          name: string;
          price_delta: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          menu_item_id: string;
          name: string;
          price_delta?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          menu_item_id?: string;
          name?: string;
          price_delta?: number;
          is_default?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      menu_modifiers: {
        Row: {
          id: string;
          tenant_slug: string;
          menu_item_id: string;
          name: string;
          price_delta: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          menu_item_id: string;
          name: string;
          price_delta?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          menu_item_id?: string;
          name?: string;
          price_delta?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      suppliers: {
        Row: {
          id: string;
          tenant_slug: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_slug: string;
          location_id: string | null;
          supplier_id: string | null;
          status: Database['public']['Enums']['purchase_status'];
          expected_delivery_at: string | null;
          received_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          location_id?: string | null;
          supplier_id?: string | null;
          status?: Database['public']['Enums']['purchase_status'];
          expected_delivery_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          location_id?: string | null;
          supplier_id?: string | null;
          status?: Database['public']['Enums']['purchase_status'];
          expected_delivery_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          inventory_item_id: string;
          quantity_ordered: number;
          quantity_received: number | null;
          unit_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          inventory_item_id: string;
          quantity_ordered: number;
          quantity_received?: number | null;
          unit_cost: number;
          created_at?: string;
        };
        Update: {
          quantity_ordered?: number;
          quantity_received?: number | null;
          unit_cost?: number;
        };
      };
      employees: {
        Row: {
          id: string;
          tenant_slug: string;
          location_id: string | null;
          profile_id: string | null;
          full_name: string;
          role: Database['public']['Enums']['user_role'];
          email: string | null;
          phone: string | null;
          hire_date: string | null;
          hourly_rate: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          location_id?: string | null;
          profile_id?: string | null;
          full_name: string;
          role: Database['public']['Enums']['user_role'];
          email?: string | null;
          phone?: string | null;
          hire_date?: string | null;
          hourly_rate?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          location_id?: string | null;
          profile_id?: string | null;
          full_name?: string;
          role?: Database['public']['Enums']['user_role'];
          email?: string | null;
          phone?: string | null;
          hire_date?: string | null;
          hourly_rate?: number | null;
          is_active?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      shifts: {
        Row: {
          id: string;
          tenant_slug: string;
          employee_id: string;
          location_id: string | null;
          start_at: string;
          end_at: string | null;
          status: Database['public']['Enums']['shift_status'];
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          employee_id: string;
          location_id?: string | null;
          start_at: string;
          end_at?: string | null;
          status?: Database['public']['Enums']['shift_status'];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          employee_id?: string;
          location_id?: string | null;
          start_at?: string;
          end_at?: string | null;
          status?: Database['public']['Enums']['shift_status'];
          notes?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      attendance_logs: {
        Row: {
          id: string;
          tenant_slug: string;
          employee_id: string;
          shift_id: string | null;
          clock_in_at: string;
          clock_out_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug: string;
          employee_id: string;
          shift_id?: string | null;
          clock_in_at: string;
          clock_out_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          shift_id?: string | null;
          clock_in_at?: string;
          clock_out_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter' | 'customer';
      stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
      order_status: 'pending' | 'preparing' | 'completed' | 'cancelled';
      notification_type: 'alert' | 'order' | 'system' | 'insight';
      fulfillment_type: 'dine_in' | 'takeaway' | 'delivery';
      payment_method: 'cash' | 'card' | 'digital_wallet';
      priority_label: 'normal' | 'urgent' | 'vip';
      kds_status: 'new' | 'preparing' | 'ready' | 'served';
      purchase_status: 'draft' | 'ordered' | 'received' | 'cancelled';
      shift_status: 'scheduled' | 'active' | 'completed' | 'cancelled';
      reservation_status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
      loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
      coupon_type: 'percent' | 'fixed';
      transfer_status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
    };
  };
}
