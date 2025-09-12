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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ats_derivatives: {
        Row: {
          bucket: string
          created_at: string | null
          id: string
          kind: string
          meta: Json | null
          object_key: string
          resume_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          id?: string
          kind: string
          meta?: Json | null
          object_key: string
          resume_id: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          object_key?: string
          resume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_derivatives_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "ats_resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_findings: {
        Row: {
          details: string | null
          finding_type: string
          id: string
          label: string
          run_id: string
          source: Json | null
          weight: number | null
        }
        Insert: {
          details?: string | null
          finding_type: string
          id?: string
          label: string
          run_id: string
          source?: Json | null
          weight?: number | null
        }
        Update: {
          details?: string | null
          finding_type?: string
          id?: string
          label?: string
          run_id?: string
          source?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ats_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_job_documents: {
        Row: {
          bucket: string
          created_at: string | null
          file_name: string
          id: string
          job_id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          file_name: string
          id?: string
          job_id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
        }
        Update: {
          bucket?: string
          created_at?: string | null
          file_name?: string
          id?: string
          job_id?: string
          mime?: string
          object_key?: string
          sha256?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "ats_job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ats_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_jobs: {
        Row: {
          company: string | null
          created_at: string | null
          description: string
          full_description: string | null
          id: string
          location: string | null
          skills_required: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          description: string
          full_description?: string | null
          id?: string
          location?: string | null
          skills_required?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          description?: string
          full_description?: string | null
          id?: string
          location?: string | null
          skills_required?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ats_resumes: {
        Row: {
          bucket: string
          created_at: string | null
          file_name: string
          id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          title: string | null
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          file_name: string
          id?: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          title?: string | null
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          file_name?: string
          id?: string
          mime?: string
          object_key?: string
          sha256?: string
          size_bytes?: number
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ats_runs: {
        Row: {
          attempts: number | null
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          job_id: string
          latency_ms: number | null
          model: string | null
          prompt_hash: string | null
          resume_id: string
          started_at: string | null
          status: string
          tokens_output: number | null
          tokens_prompt: number | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          job_id: string
          latency_ms?: number | null
          model?: string | null
          prompt_hash?: string | null
          resume_id: string
          started_at?: string | null
          status?: string
          tokens_output?: number | null
          tokens_prompt?: number | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          job_id?: string
          latency_ms?: number | null
          model?: string | null
          prompt_hash?: string | null
          resume_id?: string
          started_at?: string | null
          status?: string
          tokens_output?: number | null
          tokens_prompt?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ats_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_runs_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "ats_resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_scores: {
        Row: {
          ats_match_score: number | null
          confidence: number | null
          gap_risk: number | null
          overall_score: number | null
          run_id: string
          skills_coverage: number | null
        }
        Insert: {
          ats_match_score?: number | null
          confidence?: number | null
          gap_risk?: number | null
          overall_score?: number | null
          run_id: string
          skills_coverage?: number | null
        }
        Update: {
          ats_match_score?: number | null
          confidence?: number | null
          gap_risk?: number | null
          overall_score?: number | null
          run_id?: string
          skills_coverage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "ats_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_tracking: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          cost_amount: number
          cost_currency: string
          created_at: string
          id: string
          service_name: string
          usage_details: Json | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          cost_amount: number
          cost_currency?: string
          created_at?: string
          id?: string
          service_name: string
          usage_details?: Json | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          cost_amount?: number
          cost_currency?: string
          created_at?: string
          id?: string
          service_name?: string
          usage_details?: Json | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          document_id: string | null
          error_code: string | null
          error_details: Json | null
          error_message: string
          error_source: string
          error_type: string
          id: string
          request_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message: string
          error_source: string
          error_type: string
          id?: string
          request_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string
          error_source?: string
          error_type?: string
          id?: string
          request_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          professional_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          professional_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          professional_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sats_analyses: {
        Row: {
          ats_score: number | null
          created_at: string
          enriched_by_user: boolean
          id: string
          jd_id: string
          resume_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          created_at?: string
          enriched_by_user?: boolean
          id?: string
          jd_id: string
          resume_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_score?: number | null
          created_at?: string
          enriched_by_user?: boolean
          id?: string
          jd_id?: string
          resume_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sats_analyses_jd_id_fkey"
            columns: ["jd_id"]
            isOneToOne: false
            referencedRelation: "sats_job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sats_analyses_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "sats_resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      sats_companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      sats_job_descriptions: {
        Row: {
          company_id: string | null
          created_at: string
          file_url: string | null
          id: string
          location_id: string | null
          name: string
          pasted_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          location_id?: string | null
          name: string
          pasted_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          location_id?: string | null
          name?: string
          pasted_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sats_job_descriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sats_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sats_job_descriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "sats_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sats_job_skills: {
        Row: {
          extracted_at: string
          id: string
          job_id: string
          skill_id: string
        }
        Insert: {
          extracted_at?: string
          id?: string
          job_id: string
          skill_id: string
        }
        Update: {
          extracted_at?: string
          id?: string
          job_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sats_job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sats_job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sats_job_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "sats_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      sats_locations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sats_resumes: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sats_skill_experiences: {
        Row: {
          added_manually: boolean
          analysis_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          job_title: string | null
          keywords: string[] | null
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_manually?: boolean
          analysis_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_title?: string | null
          keywords?: string[] | null
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_manually?: boolean
          analysis_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_title?: string | null
          keywords?: string[] | null
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sats_skill_experiences_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "sats_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sats_skill_experiences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sats_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sats_skill_experiences_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "sats_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      sats_skills: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sats_user_skills: {
        Row: {
          created_at: string
          id: string
          last_used_date: string | null
          notes: string | null
          proficiency_level: string | null
          skill_id: string
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_date?: string | null
          notes?: string | null
          proficiency_level?: string | null
          skill_id: string
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_used_date?: string | null
          notes?: string | null
          proficiency_level?: string | null
          skill_id?: string
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sats_user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "sats_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      sats_users_public: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_status: {
        Row: {
          created_at: string
          error_details: Json | null
          id: string
          last_check_at: string
          response_time_ms: number | null
          service_name: string
          status: string
          updated_at: string
          uptime_percentage: number | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          id?: string
          last_check_at?: string
          response_time_ms?: number | null
          service_name: string
          status: string
          updated_at?: string
          uptime_percentage?: number | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          id?: string
          last_check_at?: string
          response_time_ms?: number | null
          service_name?: string
          status?: string
          updated_at?: string
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          created_at: string
          id: string
          metric_data: Json | null
          metric_name: string
          metric_type: string
          metric_value: number | null
          recorded_at: string
          service_source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metric_data?: Json | null
          metric_name: string
          metric_type: string
          metric_value?: number | null
          recorded_at?: string
          service_source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metric_data?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number | null
          recorded_at?: string
          service_source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      techstack_services: {
        Row: {
          added_by: string | null
          added_date: string
          cost_tier: string | null
          created_at: string
          criticality_level: string
          dashboard_url: string | null
          description: string
          docs_url: string | null
          environment: string
          id: string
          last_updated: string
          metadata: Json | null
          service_category: string
          service_name: string
          service_type: string
          status: string
          updated_by: string | null
        }
        Insert: {
          added_by?: string | null
          added_date?: string
          cost_tier?: string | null
          created_at?: string
          criticality_level?: string
          dashboard_url?: string | null
          description: string
          docs_url?: string | null
          environment?: string
          id?: string
          last_updated?: string
          metadata?: Json | null
          service_category: string
          service_name: string
          service_type: string
          status?: string
          updated_by?: string | null
        }
        Update: {
          added_by?: string | null
          added_date?: string
          cost_tier?: string | null
          created_at?: string
          criticality_level?: string
          dashboard_url?: string | null
          description?: string
          docs_url?: string | null
          environment?: string
          id?: string
          last_updated?: string
          metadata?: Json | null
          service_category?: string
          service_name?: string
          service_type?: string
          status?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_experiences: {
        Row: {
          achievements: string[] | null
          action: string
          company_or_project: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean | null
          keywords: string[]
          relevant_job_types: string[] | null
          result: string
          situation: string
          skills_gained: string[] | null
          start_date: string | null
          task: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string[] | null
          action: string
          company_or_project: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          keywords: string[]
          relevant_job_types?: string[] | null
          result: string
          situation: string
          skills_gained?: string[] | null
          start_date?: string | null
          task: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string[] | null
          action?: string
          company_or_project?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          keywords?: string[]
          relevant_job_types?: string[] | null
          result?: string
          situation?: string
          skills_gained?: string[] | null
          start_date?: string | null
          task?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_first_admin_role: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_admin_activity_summary: {
        Args: { days_back?: number }
        Returns: Json
      }
      get_admin_dashboard_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_techstack_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manage_admin_user: {
        Args: {
          action_type: string
          target_email?: string
          target_user_id?: string
        }
        Returns: Json
      }
      update_service_status: {
        Args: {
          p_error_details?: Json
          p_response_time_ms?: number
          p_service_name: string
          p_status: string
          p_uptime_percentage?: number
        }
        Returns: string
      }
      validate_admin_session: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
