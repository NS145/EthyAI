export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: "user" | "reviewer" | "admin"
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: "user" | "reviewer" | "admin"
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: "user" | "reviewer" | "admin"
          avatar_url?: string | null
          updated_at?: string
        }
      }
      content: {
        Row: {
          id: string
          user_id: string | null
          input_type: "text" | "image" | "video"
          text_content: string | null
          storage_paths: Json
          status: "pending" | "processing" | "completed" | "failed"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          input_type: "text" | "image" | "video"
          text_content?: string | null
          storage_paths?: Json
          status?: "pending" | "processing" | "completed" | "failed"
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string | null
          input_type?: "text" | "image" | "video"
          text_content?: string | null
          storage_paths?: Json
          status?: "pending" | "processing" | "completed" | "failed"
          updated_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          content_id: string
          score: number
          verdict: "authentic" | "suspicious" | "misinformation"
          confidence: number | null
          probabilities: Json | null
          highlights: Json
          shap_values: Json
          evidence: Json
          modules: Json
          language: Json | null
          modalities: string[]
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          score: number
          verdict: "authentic" | "suspicious" | "misinformation"
          confidence?: number | null
          probabilities?: Json | null
          highlights?: Json
          shap_values?: Json
          evidence?: Json
          modules?: Json
          language?: Json | null
          modalities?: string[]
          summary?: string | null
          created_at?: string
        }
        Update: {
          score?: number
          verdict?: "authentic" | "suspicious" | "misinformation"
          confidence?: number | null
          probabilities?: Json | null
          highlights?: Json
          shap_values?: Json
          evidence?: Json
          modules?: Json
          language?: Json | null
          modalities?: string[]
          summary?: string | null
        }
      }
      review_queue: {
        Row: {
          id: string
          content_id: string
          feedback_id: string | null
          reason: string | null
          priority: number
          status: "pending" | "approve" | "reject" | "escalate"
          reviewer_id: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          feedback_id?: string | null
          reason?: string | null
          priority?: number
          status?: "pending" | "approve" | "reject" | "escalate"
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
        }
        Update: {
          reason?: string | null
          priority?: number
          status?: "pending" | "approve" | "reject" | "escalate"
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
        }
      }
      feedback: {
        Row: {
          id: string
          content_id: string
          user_id: string | null
          feedback_type: "dispute" | "correction" | "report"
          reason: string
          status: "pending" | "reviewed" | "resolved"
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          user_id?: string | null
          feedback_type: "dispute" | "correction" | "report"
          reason: string
          status?: "pending" | "reviewed" | "resolved"
          created_at?: string
        }
        Update: {
          feedback_type?: "dispute" | "correction" | "report"
          reason?: string
          status?: "pending" | "reviewed" | "resolved"
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
        }
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
