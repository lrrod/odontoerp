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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          dentist_id: string
          duration_minutes: number
          id: string
          patient_id: string
          procedure: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          dentist_id: string
          duration_minutes?: number
          id?: string
          patient_id: string
          procedure: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          dentist_id?: string
          duration_minutes?: number
          id?: string
          patient_id?: string
          procedure?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clinical_evolutions: {
        Row: {
          appointment_id: string | null
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          patient_id: string
          procedures_done: string | null
        }
        Insert: {
          appointment_id?: string | null
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          patient_id: string
          procedures_done?: string | null
        }
        Update: {
          appointment_id?: string | null
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          procedures_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_evolutions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      dentist_schedules: {
        Row: {
          created_at: string
          dentist_id: string
          end_time: string
          id: string
          lunch_end: string | null
          lunch_start: string | null
          slot_minutes: number
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          dentist_id: string
          end_time: string
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          slot_minutes?: number
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          dentist_id?: string
          end_time?: string
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          slot_minutes?: number
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "dentist_schedules_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          active: boolean
          created_at: string
          cro: string | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          cro?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          cro?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evolution_drafts: {
        Row: {
          appointment_id: string
          content: string
          patient_id: string
          step_ids: string[]
          updated_at: string
        }
        Insert: {
          appointment_id: string
          content?: string
          patient_id: string
          step_ids?: string[]
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          content?: string
          patient_id?: string
          step_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_drafts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_drafts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          email: string
          failed_count: number
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          email: string
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          active: boolean
          birth_date: string | null
          clinical_notes: string | null
          cpf: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          insurance: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          clinical_notes?: string | null
          cpf: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          insurance?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          clinical_notes?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          insurance?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          method: string
          paid_on: string
          patient_id: string
          receipt_no: number
          receivable_id: string
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          refunded_by_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          method: string
          paid_on: string
          patient_id: string
          receipt_no?: number
          receivable_id: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          refunded_by_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          method?: string
          paid_on?: string
          patient_id?: string
          receipt_no?: number
          receivable_id?: string
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          refunded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          description: string
          id: string
          position: number
          price: number
          procedure_id: string | null
          quote_id: string
          step_id: string | null
          teeth: number[]
        }
        Insert: {
          description: string
          id?: string
          position?: number
          price: number
          procedure_id?: string | null
          quote_id: string
          step_id?: string | null
          teeth?: number[]
        }
        Update: {
          description?: string
          id?: string
          position?: number
          price?: number
          procedure_id?: string | null
          quote_id?: string
          step_id?: string | null
          teeth?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          discount_amount: number
          discount_approved_by: string | null
          discount_approved_name: string | null
          discount_type: string
          discount_value: number
          first_due: string
          id: string
          installments: number
          number: number
          patient_id: string
          refusal_reason: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_amount?: number
          discount_approved_by?: string | null
          discount_approved_name?: string | null
          discount_type?: string
          discount_value?: number
          first_due: string
          id?: string
          installments?: number
          number?: number
          patient_id: string
          refusal_reason?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_amount?: number
          discount_approved_by?: string | null
          discount_approved_name?: string | null
          discount_type?: string
          discount_value?: number
          first_due?: string
          id?: string
          installments?: number
          number?: number
          patient_id?: string
          refusal_reason?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          installment_no: number | null
          paid_amount: number
          patient_id: string
          quote_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          installment_no?: number | null
          paid_amount?: number
          patient_id: string
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installment_no?: number | null
          paid_amount?: number
          patient_id?: string
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          balance: number
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          lot: string | null
          minimum: number
          name: string
          updated_at: string
        }
        Insert: {
          balance?: number
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot?: string | null
          minimum?: number
          name: string
          updated_at?: string
        }
        Update: {
          balance?: number
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot?: string | null
          minimum?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tooth_conditions: {
        Row: {
          condition: string
          face: string
          id: string
          patient_id: string
          tooth: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          condition: string
          face?: string
          id?: string
          patient_id: string
          tooth: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          condition?: string
          face?: string
          id?: string
          patient_id?: string
          tooth?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooth_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_steps: {
        Row: {
          completed_evolution_id: string | null
          created_at: string
          id: string
          patient_id: string
          procedure_id: string
          status: string
          step_order: number
          teeth: number[]
          updated_at: string
        }
        Insert: {
          completed_evolution_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          procedure_id: string
          status?: string
          step_order?: number
          teeth?: number[]
          updated_at?: string
        }
        Update: {
          completed_evolution_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          procedure_id?: string
          status?: string
          step_order?: number
          teeth?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_steps_completed_evolution_id_fkey"
            columns: ["completed_evolution_id"]
            isOneToOne: false
            referencedRelation: "clinical_evolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_steps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_steps_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_quote: { Args: { _quote: string }; Returns: undefined }
      can_access_chart: { Args: { _patient: string }; Returns: boolean }
      current_dentist_id: { Args: never; Returns: string }
      dashboard_stock_alerts: {
        Args: never
        Returns: {
          days_to_expiry: number
          kind: string
          name: string
        }[]
      }
      finalize_appointment: {
        Args: { _appointment: string; _content: string; _step_ids: string[] }
        Returns: string
      }
      find_patient_by_cpf: {
        Args: { _cpf: string }
        Returns: {
          active: boolean
          full_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      quote_plan_items: {
        Args: { _patient: string }
        Returns: {
          code: string
          name: string
          price: number
          procedure_id: string
          step_id: string
          step_order: number
          teeth: number[]
        }[]
      }
      refund_payment: {
        Args: { _payment: string; _reason: string }
        Returns: undefined
      }
      register_payment: {
        Args: {
          _amount: number
          _method: string
          _paid_on: string
          _receivable: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "dentista" | "recepcionista"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "dentista", "recepcionista"],
    },
  },
} as const
