export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      feedbacks: {
        Row: {
          id: string;
          store_code: string;
          type: "retroalimentacion" | "llamado_atencion";
          created_by: string;
          directed_to: string;
          reason: string;
          description: string;
          commitment: string;
          status: "activo" | "resuelto" | "anulado";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_code: string;
          type: "retroalimentacion" | "llamado_atencion";
          created_by: string;
          directed_to: string;
          reason: string;
          description: string;
          commitment: string;
          status?: "activo" | "resuelto" | "anulado";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_code?: string;
          type?: "retroalimentacion" | "llamado_atencion";
          created_by?: string;
          directed_to?: string;
          reason?: string;
          description?: string;
          commitment?: string;
          status?: "activo" | "resuelto" | "anulado";
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          full_name?: string;
          display_name: string;
          email: string;
          status: string;
          store_name: string;
          store_code: string;
          second_in_charge: string;
          third_in_charge: string;
          assistant_count: number;
          assistants: Json;
          areas: Json;
          basic_tasks: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          full_name?: string;
          display_name: string;
          email: string;
          status?: string;
          store_name: string;
          store_code: string;
          second_in_charge?: string;
          third_in_charge?: string;
          assistant_count?: number;
          assistants?: Json;
          areas?: Json;
          basic_tasks?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          full_name?: string;
          display_name?: string;
          email?: string;
          status?: string;
          store_name?: string;
          store_code?: string;
          second_in_charge?: string;
          third_in_charge?: string;
          assistant_count?: number;
          assistants?: Json;
          areas?: Json;
          basic_tasks?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      instructions: {
        Row: {
          id: string;
          responsible: string;
          content: string;
          priority: string;
          status: string;
          store_code: string;
          created_by: string;
          operator_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          responsible: string;
          content: string;
          priority: string;
          status?: string;
          store_code: string;
          created_by: string;
          operator_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          responsible?: string;
          content?: string;
          priority?: string;
          status?: string;
          store_code?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_logbook: {
        Row: {
          id: string;
          store_code: string;
          author: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_code: string;
          author: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_code?: string;
          author?: string;
          content?: string;
          created_at?: string;
        };
      };
      pre_shifts: {
        Row: {
          id: string;
          store_code: string;
          created_by: string;
          date: string;
          daily_sales_goal: number;
          impulse_focus: string;
          priority: string;
          average_ticket_goal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_code: string;
          created_by: string;
          date?: string;
          daily_sales_goal?: number;
          impulse_focus: string;
          priority: string;
          average_ticket_goal?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_code?: string;
          created_by?: string;
          date?: string;
          daily_sales_goal?: number;
          impulse_focus?: string;
          priority?: string;
          average_ticket_goal?: number;
          created_at?: string;
        };
      };
      quadrant_assignments: {
        Row: {
          id: string;
          store_code: string;
          assigned_by: string;
          assigned_to: string;
          quadrant_name: string;
          status: string;
          notes: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          store_code: string;
          assigned_by: string;
          assigned_to: string;
          quadrant_name: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          store_code?: string;
          assigned_by?: string;
          assigned_to?: string;
          quadrant_name?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          barcode_id: string;
          material_code: string | null;
          name: string;
          category: string;
          unit: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          barcode_id: string;
          material_code?: string | null;
          name: string;
          category: string;
          unit: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          barcode_id?: string;
          material_code?: string | null;
          name?: string;
          category?: string;
          unit?: string;
          created_at?: string;
        };
      };
      waste_records: {
        Row: {
          id: string;
          barcode_id: string;
          product_id: string | null;
          qty: number;
          unit: string;
          reason: string;
          deposited_by: string;
          area: string;
          status: string;
          observation: string;
          image_url: string | null;
          store_code: string;
          idempotency_key: string | null;
          created_by: string;
          operator_name: string | null;
          created_at: string;
          transport_driver: string | null;
          transport_plate: string | null;
          transport_comment: string | null;
          transport_evidence: {
            novedad: string;
            lote: string;
            proveedor: string;
            cantidades: string;
          } | null;
        };
        Insert: {
          id?: string;
          barcode_id: string;
          product_id?: string | null;
          qty: number;
          unit: string;
          reason: string;
          deposited_by: string;
          area: string;
          status?: string;
          observation?: string;
          image_url?: string | null;
          store_code: string;
          idempotency_key?: string | null;
          created_by: string;
          operator_name?: string | null;
          created_at?: string;
          transport_driver?: string | null;
          transport_plate?: string | null;
          transport_comment?: string | null;
          transport_evidence?: {
            novedad: string;
            lote: string;
            proveedor: string;
            cantidades: string;
          } | null;
        };
        Update: {
          id?: string;
          barcode_id?: string;
          product_id?: string | null;
          qty?: number;
          unit?: string;
          reason?: string;
          deposited_by?: string;
          area?: string;
          status?: string;
          observation?: string;
          image_url?: string | null;
          store_code?: string;
          idempotency_key?: string | null;
          created_by?: string;
          created_at?: string;
          transport_driver?: string | null;
          transport_plate?: string | null;
          transport_comment?: string | null;
          transport_evidence?: {
            novedad: string;
            lote: string;
            proveedor: string;
            cantidades: string;
          } | null;
        };
      };
      daily_basics: {
        Row: {
          id: string;
          profile_id: string | null;
          date: string;
          task_name: string;
          task_type: string;
          assigned_to: string;
          status: string;
          fault: string | null;
          created_by: string;
          operator_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          date?: string;
          task_name: string;
          task_type: string;
          assigned_to: string;
          status?: string;
          fault?: string | null;
          created_by: string;
          operator_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          date?: string;
          task_name?: string;
          task_type?: string;
          assigned_to?: string;
          status?: string;
          fault?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
