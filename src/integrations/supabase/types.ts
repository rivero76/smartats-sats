export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      ats_derivatives: {
        Row: {
          bucket: string
          created_at: string | null
          created_by: string | null
          id: string
          kind: string
          meta: Json | null
          object_key: string
          resume_id: string
          updated_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind: string
          meta?: Json | null
          object_key: string
          resume_id: string
          updated_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          object_key?: string
          resume_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ats_derivatives_resume_id_fkey'
            columns: ['resume_id']
            isOneToOne: false
            referencedRelation: 'ats_resumes'
            referencedColumns: ['id']
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
            foreignKeyName: 'ats_findings_run_id_fkey'
            columns: ['run_id']
            isOneToOne: false
            referencedRelation: 'ats_runs'
            referencedColumns: ['id']
          },
        ]
      }
      ats_job_documents: {
        Row: {
          bucket: string
          created_at: string | null
          created_by: string | null
          file_name: string
          id: string
          job_id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          updated_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          file_name: string
          id?: string
          job_id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          updated_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          file_name?: string
          id?: string
          job_id?: string
          mime?: string
          object_key?: string
          sha256?: string
          size_bytes?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ats_job_documents_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'ats_jobs'
            referencedColumns: ['id']
          },
        ]
      }
      ats_jobs: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          full_description: string | null
          id: string
          location: string | null
          skills_required: string[] | null
          title: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          full_description?: string | null
          id?: string
          location?: string | null
          skills_required?: string[] | null
          title: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          full_description?: string | null
          id?: string
          location?: string | null
          skills_required?: string[] | null
          title?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ats_resumes: {
        Row: {
          bucket: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_name: string
          id: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          title: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_name: string
          id?: string
          mime: string
          object_key: string
          sha256: string
          size_bytes: number
          title?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_name?: string
          id?: string
          mime?: string
          object_key?: string
          sha256?: string
          size_bytes?: number
          title?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ats_runs: {
        Row: {
          attempts: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
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
          tenant_id: string | null
          tokens_output: number | null
          tokens_prompt: number | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          tenant_id?: string | null
          tokens_output?: number | null
          tokens_prompt?: number | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          tenant_id?: string | null
          tokens_output?: number | null
          tokens_prompt?: number | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ats_runs_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'ats_jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ats_runs_resume_id_fkey'
            columns: ['resume_id']
            isOneToOne: false
            referencedRelation: 'ats_resumes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ats_runs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'ats_scores_run_id_fkey'
            columns: ['run_id']
            isOneToOne: true
            referencedRelation: 'ats_runs'
            referencedColumns: ['id']
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
      document_extractions: {
        Row: {
          created_at: string
          created_by: string | null
          extracted_text: string
          extraction_method: string
          id: string
          metadata: Json | null
          resume_id: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          warnings: Json | null
          word_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          extracted_text: string
          extraction_method: string
          id?: string
          metadata?: Json | null
          resume_id: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          warnings?: Json | null
          word_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          extracted_text?: string
          extraction_method?: string
          id?: string
          metadata?: Json | null
          resume_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          warnings?: Json | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'document_extractions_resume_id_fkey'
            columns: ['resume_id']
            isOneToOne: true
            referencedRelation: 'sats_resumes'
            referencedColumns: ['id']
          },
        ]
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
      log_settings_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          log_setting_id: string
          new_row: Json | null
          old_row: Json | null
          operation: string
          script_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          log_setting_id: string
          new_row?: Json | null
          old_row?: Json | null
          operation: string
          script_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          log_setting_id?: string
          new_row?: Json | null
          old_row?: Json | null
          operation?: string
          script_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          email: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          plan_override: string | null
          portfolio_url: string | null
          preferred_currency: string
          preferred_locale: string
          primary_target_role_family_id: string | null
          proactive_match_threshold: number | null
          professional_summary: string | null
          target_market_codes: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          plan_override?: string | null
          portfolio_url?: string | null
          preferred_currency?: string
          preferred_locale?: string
          primary_target_role_family_id?: string | null
          proactive_match_threshold?: number | null
          professional_summary?: string | null
          target_market_codes?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          plan_override?: string | null
          portfolio_url?: string | null
          preferred_currency?: string
          preferred_locale?: string
          primary_target_role_family_id?: string | null
          proactive_match_threshold?: number | null
          professional_summary?: string | null
          target_market_codes?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_preferred_currency_fkey'
            columns: ['preferred_currency']
            isOneToOne: false
            referencedRelation: 'sats_currencies'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'profiles_preferred_locale_fkey'
            columns: ['preferred_locale']
            isOneToOne: false
            referencedRelation: 'sats_locales'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'profiles_primary_target_role_family_id_fkey'
            columns: ['primary_target_role_family_id']
            isOneToOne: false
            referencedRelation: 'sats_role_families'
            referencedColumns: ['id']
          },
        ]
      }
      rjh_alerts: {
        Row: {
          created_at: string
          gmail_message_id: string
          id: string
          job_urls_found: number
          processed: boolean
          processed_at: string | null
          raw_html: string | null
          received_at: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          gmail_message_id: string
          id?: string
          job_urls_found?: number
          processed?: boolean
          processed_at?: string | null
          raw_html?: string | null
          received_at?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          gmail_message_id?: string
          id?: string
          job_urls_found?: number
          processed?: boolean
          processed_at?: string | null
          raw_html?: string | null
          received_at?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      rjh_audit_log: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          operation: string
          payload: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          changed_by?: string
          created_at?: string
          id?: string
          operation: string
          payload?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          operation?: string
          payload?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      rjh_companies: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          name: string
          size_range: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          name: string
          size_range?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          name?: string
          size_range?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rjh_gmail_filter_config: {
        Row: {
          after_date: string | null
          created_at: string
          id: string
          max_results: number
          updated_at: string
        }
        Insert: {
          after_date?: string | null
          created_at?: string
          id?: string
          max_results?: number
          updated_at?: string
        }
        Update: {
          after_date?: string | null
          created_at?: string
          id?: string
          max_results?: number
          updated_at?: string
        }
        Relationships: []
      }
      rjh_job_skills: {
        Row: {
          is_required: boolean
          job_id: string
          skill_id: string
        }
        Insert: {
          is_required?: boolean
          job_id: string
          skill_id: string
        }
        Update: {
          is_required?: boolean
          job_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rjh_job_skills_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'rjh_jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rjh_job_skills_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'rjh_skills'
            referencedColumns: ['id']
          },
        ]
      }
      rjh_jobs: {
        Row: {
          company_id: string | null
          created_at: string
          currency: string
          description_raw: string | null
          description_text: string | null
          employment_type: string | null
          extracted_at: string | null
          id: string
          location: string | null
          posted_at: string | null
          remote_type: string | null
          role_category: string | null
          salary_max: number | null
          salary_min: number | null
          scraped_at: string
          seniority: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency?: string
          description_raw?: string | null
          description_text?: string | null
          employment_type?: string | null
          extracted_at?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote_type?: string | null
          role_category?: string | null
          salary_max?: number | null
          salary_min?: number | null
          scraped_at?: string
          seniority?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency?: string
          description_raw?: string | null
          description_text?: string | null
          employment_type?: string | null
          extracted_at?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote_type?: string | null
          role_category?: string | null
          salary_max?: number | null
          salary_min?: number | null
          scraped_at?: string
          seniority?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rjh_jobs_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'rjh_companies'
            referencedColumns: ['id']
          },
        ]
      }
      rjh_pipeline: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          jira_key: string | null
          job_id: string
          notes: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          jira_key?: string | null
          job_id: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          jira_key?: string | null
          job_id?: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rjh_pipeline_job_id_fkey'
            columns: ['job_id']
            isOneToOne: true
            referencedRelation: 'rjh_jobs'
            referencedColumns: ['id']
          },
        ]
      }
      rjh_pipeline_runs: {
        Row: {
          alerts_found: number
          created_at: string
          errors: Json
          finished_at: string | null
          id: string
          jira_created: number
          jobs_attempted: number
          jobs_saved: number
          log_lines: Json
          paused_until: string | null
          started_at: string
          status: string
          urls_found: number
          urls_new: number
        }
        Insert: {
          alerts_found?: number
          created_at?: string
          errors?: Json
          finished_at?: string | null
          id?: string
          jira_created?: number
          jobs_attempted?: number
          jobs_saved?: number
          log_lines?: Json
          paused_until?: string | null
          started_at?: string
          status?: string
          urls_found?: number
          urls_new?: number
        }
        Update: {
          alerts_found?: number
          created_at?: string
          errors?: Json
          finished_at?: string | null
          id?: string
          jira_created?: number
          jobs_attempted?: number
          jobs_saved?: number
          log_lines?: Json
          paused_until?: string | null
          started_at?: string
          status?: string
          urls_found?: number
          urls_new?: number
        }
        Relationships: []
      }
      rjh_search_terms: {
        Row: {
          active: boolean
          alert_count: number
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          term: string
        }
        Insert: {
          active?: boolean
          alert_count?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          term: string
        }
        Update: {
          active?: boolean
          alert_count?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          term?: string
        }
        Relationships: []
      }
      rjh_skills: {
        Row: {
          category: string | null
          created_at: string
          frequency_score: number
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          frequency_score?: number
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          frequency_score?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      sats_account_deletion_logs: {
        Row: {
          action: string
          created_at: string
          data_deleted: Json | null
          deletion_reason: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data_deleted?: Json | null
          deletion_reason?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data_deleted?: Json | null
          deletion_reason?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sats_agent_handoffs: {
        Row: {
          context_passed: Json
          from_agent_id: string
          id: string
          occurred_at: string
          protocol: string
          reason: string
          task_id: string
          tenant_id: string | null
          to_agent_id: string
        }
        Insert: {
          context_passed?: Json
          from_agent_id: string
          id?: string
          occurred_at?: string
          protocol?: string
          reason: string
          task_id: string
          tenant_id?: string | null
          to_agent_id: string
        }
        Update: {
          context_passed?: Json
          from_agent_id?: string
          id?: string
          occurred_at?: string
          protocol?: string
          reason?: string
          task_id?: string
          tenant_id?: string | null
          to_agent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_agent_handoffs_from_agent_id_fkey'
            columns: ['from_agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_handoffs_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'sats_agent_tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_handoffs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_handoffs_to_agent_id_fkey'
            columns: ['to_agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
        ]
      }
      sats_agent_memory: {
        Row: {
          agent_id: string
          created_at: string
          expires_at: string | null
          id: string
          key: string
          scope: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          value: Json
          value_embedding: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          value?: Json
          value_embedding?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          scope?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          value?: Json
          value_embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_agent_memory_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_memory_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_agent_tasks: {
        Row: {
          assigned_agent_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          input_payload: Json
          max_retries: number
          objective: string
          output_payload: Json | null
          parent_task_id: string | null
          priority: number
          requires_human_review: boolean
          retry_count: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          started_at: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_agent_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          input_payload?: Json
          max_retries?: number
          objective: string
          output_payload?: Json | null
          parent_task_id?: string | null
          priority?: number
          requires_human_review?: boolean
          retry_count?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          input_payload?: Json
          max_retries?: number
          objective?: string
          output_payload?: Json | null
          parent_task_id?: string | null
          priority?: number
          requires_human_review?: boolean
          retry_count?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_agent_tasks_assigned_agent_id_fkey'
            columns: ['assigned_agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'sats_agent_tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_tasks_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_agent_tasks_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_ai_agents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          knowledge_source_ids: string[]
          max_tokens: number | null
          model_id: string
          model_provider: string
          name: string
          slug: string
          status: string
          system_prompt: string | null
          temperature: number
          tenant_id: string | null
          tools: Json
          type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge_source_ids?: string[]
          max_tokens?: number | null
          model_id: string
          model_provider?: string
          name: string
          slug: string
          status?: string
          system_prompt?: string | null
          temperature?: number
          tenant_id?: string | null
          tools?: Json
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge_source_ids?: string[]
          max_tokens?: number | null
          model_id?: string
          model_provider?: string
          name?: string
          slug?: string
          status?: string
          system_prompt?: string | null
          temperature?: number
          tenant_id?: string | null
          tools?: Json
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_ai_agents_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_ai_evaluations: {
        Row: {
          evaluated_at: string
          evaluator_id: string | null
          evaluator_type: string
          expected_output: string | null
          id: string
          message_id: string
          metric: string
          reasoning: string | null
          score: number
          tenant_id: string | null
        }
        Insert: {
          evaluated_at?: string
          evaluator_id?: string | null
          evaluator_type?: string
          expected_output?: string | null
          id?: string
          message_id: string
          metric: string
          reasoning?: string | null
          score: number
          tenant_id?: string | null
        }
        Update: {
          evaluated_at?: string
          evaluator_id?: string | null
          evaluator_type?: string
          expected_output?: string | null
          id?: string
          message_id?: string
          metric?: string
          reasoning?: string | null
          score?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_ai_evaluations_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_ai_evaluations_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_ai_messages: {
        Row: {
          cache_read_tokens: number
          content: string
          cost_usd: number
          created_at: string
          feedback_score: number | null
          id: string
          input_tokens: number
          latency_ms: number | null
          output_tokens: number
          retrieved_chunks: string[]
          role: string
          session_id: string
          tenant_id: string | null
          tool_calls: Json
          tool_results: Json
          turn_index: number
        }
        Insert: {
          cache_read_tokens?: number
          content: string
          cost_usd?: number
          created_at?: string
          feedback_score?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          output_tokens?: number
          retrieved_chunks?: string[]
          role: string
          session_id: string
          tenant_id?: string | null
          tool_calls?: Json
          tool_results?: Json
          turn_index: number
        }
        Update: {
          cache_read_tokens?: number
          content?: string
          cost_usd?: number
          created_at?: string
          feedback_score?: number | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          output_tokens?: number
          retrieved_chunks?: string[]
          role?: string
          session_id?: string
          tenant_id?: string | null
          tool_calls?: Json
          tool_results?: Json
          turn_index?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_ai_messages_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_ai_messages_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_ai_sessions: {
        Row: {
          agent_id: string
          channel: string
          context: Json
          ended_at: string | null
          id: string
          memory_summary: string | null
          started_at: string
          status: string
          tenant_id: string | null
          total_cost_usd: number
          total_input_tokens: number
          total_output_tokens: number
          user_id: string | null
        }
        Insert: {
          agent_id: string
          channel?: string
          context?: Json
          ended_at?: string | null
          id?: string
          memory_summary?: string | null
          started_at?: string
          status?: string
          tenant_id?: string | null
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          channel?: string
          context?: Json
          ended_at?: string | null
          id?: string
          memory_summary?: string | null
          started_at?: string
          status?: string
          tenant_id?: string | null
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_ai_sessions_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_ai_sessions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_analyses: {
        Row: {
          analysis_data: Json | null
          ats_score: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          enriched_by_user: boolean
          id: string
          jd_id: string
          matched_skills: Json | null
          missing_skills: Json | null
          proactive_staged_job_id: string | null
          resume_id: string
          status: string
          suggestions: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          analysis_data?: Json | null
          ats_score?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enriched_by_user?: boolean
          id?: string
          jd_id: string
          matched_skills?: Json | null
          missing_skills?: Json | null
          proactive_staged_job_id?: string | null
          resume_id: string
          status?: string
          suggestions?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          analysis_data?: Json | null
          ats_score?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enriched_by_user?: boolean
          id?: string
          jd_id?: string
          matched_skills?: Json | null
          missing_skills?: Json | null
          proactive_staged_job_id?: string | null
          resume_id?: string
          status?: string
          suggestions?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_analyses_jd_id_fkey'
            columns: ['jd_id']
            isOneToOne: false
            referencedRelation: 'sats_job_descriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_analyses_proactive_staged_job_id_fkey'
            columns: ['proactive_staged_job_id']
            isOneToOne: false
            referencedRelation: 'sats_staged_jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_analyses_resume_id_fkey'
            columns: ['resume_id']
            isOneToOne: false
            referencedRelation: 'sats_resumes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_analyses_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sats_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_audit_logs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
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
      sats_currencies: {
        Row: {
          code: string
          decimal_places: number
          is_active: boolean
          name: string
          symbol: string
        }
        Insert: {
          code: string
          decimal_places?: number
          is_active?: boolean
          name: string
          symbol: string
        }
        Update: {
          code?: string
          decimal_places?: number
          is_active?: boolean
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      sats_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          embedding_model: string
          id: string
          indexed_at: string
          language: string
          metadata: Json
          page_number: number | null
          section_heading: string | null
          source_id: string
          tenant_id: string | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          indexed_at?: string
          language?: string
          metadata?: Json
          page_number?: number | null
          section_heading?: string | null
          source_id: string
          tenant_id?: string | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          indexed_at?: string
          language?: string
          metadata?: Json
          page_number?: number | null
          section_heading?: string | null
          source_id?: string
          tenant_id?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_document_chunks_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'sats_knowledge_sources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_document_chunks_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_enriched_experiences: {
        Row: {
          analysis_id: string | null
          approved_at: string | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          edited_by_user: boolean
          explanation: string | null
          id: string
          jd_id: string | null
          resume_id: string
          skill_experience_id: string | null
          skill_name: string
          skill_type: string
          source: Json | null
          suggestion: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_action: string
          user_id: string
          version: number
        }
        Insert: {
          analysis_id?: string | null
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          edited_by_user?: boolean
          explanation?: string | null
          id?: string
          jd_id?: string | null
          resume_id: string
          skill_experience_id?: string | null
          skill_name: string
          skill_type: string
          source?: Json | null
          suggestion: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_action?: string
          user_id: string
          version?: number
        }
        Update: {
          analysis_id?: string | null
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          edited_by_user?: boolean
          explanation?: string | null
          id?: string
          jd_id?: string | null
          resume_id?: string
          skill_experience_id?: string | null
          skill_name?: string
          skill_type?: string
          source?: Json | null
          suggestion?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_action?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'enriched_experiences_analysis_id_fkey'
            columns: ['analysis_id']
            isOneToOne: false
            referencedRelation: 'sats_analyses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enriched_experiences_jd_id_fkey'
            columns: ['jd_id']
            isOneToOne: false
            referencedRelation: 'sats_job_descriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enriched_experiences_resume_id_fkey'
            columns: ['resume_id']
            isOneToOne: false
            referencedRelation: 'sats_resumes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enriched_experiences_skill_experience_id_fkey'
            columns: ['skill_experience_id']
            isOneToOne: false
            referencedRelation: 'sats_skill_experiences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_enriched_experiences_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_exchange_rates: {
        Row: {
          created_at: string
          effective_at: string
          from_currency: string
          id: string
          rate: number
          source: string
          to_currency: string
        }
        Insert: {
          created_at?: string
          effective_at?: string
          from_currency: string
          id?: string
          rate: number
          source?: string
          to_currency: string
        }
        Update: {
          created_at?: string
          effective_at?: string
          from_currency?: string
          id?: string
          rate?: number
          source?: string
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_exchange_rates_from_currency_fkey'
            columns: ['from_currency']
            isOneToOne: false
            referencedRelation: 'sats_currencies'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'sats_exchange_rates_to_currency_fkey'
            columns: ['to_currency']
            isOneToOne: false
            referencedRelation: 'sats_currencies'
            referencedColumns: ['code']
          },
        ]
      }
      sats_feature_flags: {
        Row: {
          feature_key: string
          id: string
          is_enabled: boolean
          plan_tier: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          id?: string
          is_enabled?: boolean
          plan_tier: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_key?: string
          id?: string
          is_enabled?: boolean
          plan_tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sats_features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sats_gap_items: {
        Row: {
          candidate_status: string
          created_at: string
          estimated_weeks_to_close: number | null
          frequency_pct: number
          id: string
          priority_tier: string
          recommended_action: string | null
          resume_language_template: string | null
          signal_type: string
          signal_value: string
          snapshot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_status: string
          created_at?: string
          estimated_weeks_to_close?: number | null
          frequency_pct: number
          id?: string
          priority_tier: string
          recommended_action?: string | null
          resume_language_template?: string | null
          signal_type: string
          signal_value: string
          snapshot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_status?: string
          created_at?: string
          estimated_weeks_to_close?: number | null
          frequency_pct?: number
          id?: string
          priority_tier?: string
          recommended_action?: string | null
          resume_language_template?: string | null
          signal_type?: string
          signal_value?: string
          snapshot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_gap_items_snapshot_id_fkey'
            columns: ['snapshot_id']
            isOneToOne: false
            referencedRelation: 'sats_gap_snapshots'
            referencedColumns: ['id']
          },
        ]
      }
      sats_gap_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          critical_gap_count: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          important_gap_count: number
          market_code: string
          market_signals_window_end: string | null
          nice_to_have_gap_count: number
          overall_gap_score: number
          role_family_id: string
          snapshot_date: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          critical_gap_count?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          important_gap_count?: number
          market_code: string
          market_signals_window_end?: string | null
          nice_to_have_gap_count?: number
          overall_gap_score?: number
          role_family_id: string
          snapshot_date?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          critical_gap_count?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          important_gap_count?: number
          market_code?: string
          market_signals_window_end?: string | null
          nice_to_have_gap_count?: number
          overall_gap_score?: number
          role_family_id?: string
          snapshot_date?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_gap_snapshots_role_family_id_fkey'
            columns: ['role_family_id']
            isOneToOne: false
            referencedRelation: 'sats_role_families'
            referencedColumns: ['id']
          },
        ]
      }
      sats_idempotency_keys: {
        Row: {
          created_at: string
          endpoint: string
          expires_at: string
          id: string
          key: string
          response_body: Json
          response_status: number
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          expires_at?: string
          id?: string
          key: string
          response_body?: Json
          response_status: number
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          expires_at?: string
          id?: string
          key?: string
          response_body?: Json
          response_status?: number
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_idempotency_keys_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_job_descriptions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_url: string | null
          id: string
          location_id: string | null
          name: string
          pasted_text: string | null
          proactive_staged_job_id: string | null
          source_type: string | null
          source_url: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_url?: string | null
          id?: string
          location_id?: string | null
          name: string
          pasted_text?: string | null
          proactive_staged_job_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_url?: string | null
          id?: string
          location_id?: string | null
          name?: string
          pasted_text?: string | null
          proactive_staged_job_id?: string | null
          source_type?: string | null
          source_url?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_job_descriptions_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'sats_companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_job_descriptions_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'sats_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_job_descriptions_proactive_staged_job_id_fkey'
            columns: ['proactive_staged_job_id']
            isOneToOne: false
            referencedRelation: 'sats_staged_jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_job_descriptions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'sats_job_skills_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'sats_job_descriptions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_job_skills_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'sats_skills'
            referencedColumns: ['id']
          },
        ]
      }
      sats_knowledge_sources: {
        Row: {
          chunk_overlap_tokens: number
          chunk_size_tokens: number
          chunk_strategy: string
          config: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          embedding_dimensions: number
          embedding_model: string
          id: string
          last_indexed_at: string | null
          name: string
          status: string
          tenant_id: string | null
          total_chunks: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chunk_overlap_tokens?: number
          chunk_size_tokens?: number
          chunk_strategy?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          embedding_dimensions?: number
          embedding_model?: string
          id?: string
          last_indexed_at?: string | null
          name: string
          status?: string
          tenant_id?: string | null
          total_chunks?: number | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chunk_overlap_tokens?: number
          chunk_size_tokens?: number
          chunk_strategy?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          embedding_dimensions?: number
          embedding_model?: string
          id?: string
          last_indexed_at?: string | null
          name?: string
          status?: string
          tenant_id?: string | null
          total_chunks?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_knowledge_sources_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_learning_roadmaps: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          source_ats_analysis_id: string | null
          source_gap_snapshot_id: string | null
          status: string
          target_role: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          source_ats_analysis_id?: string | null
          source_gap_snapshot_id?: string | null
          status?: string
          target_role: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          source_ats_analysis_id?: string | null
          source_gap_snapshot_id?: string | null
          status?: string
          target_role?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_learning_roadmaps_source_ats_analysis_id_fkey'
            columns: ['source_ats_analysis_id']
            isOneToOne: false
            referencedRelation: 'sats_analyses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_learning_roadmaps_source_gap_snapshot_id_fkey'
            columns: ['source_gap_snapshot_id']
            isOneToOne: false
            referencedRelation: 'sats_gap_snapshots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_learning_roadmaps_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_llm_call_logs: {
        Row: {
          analysis_id: string | null
          called_at: string
          completion_tokens: number
          cost_usd: number
          currency_code: string
          duration_ms: number | null
          error_code: string | null
          finish_reason: string | null
          function_name: string
          id: string
          model_id: string
          model_provider: string
          prompt_template_id: string | null
          prompt_tokens: number
          prompt_version: number | null
          run_id: string | null
          span_id: string | null
          tenant_id: string | null
          total_tokens: number | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          called_at?: string
          completion_tokens?: number
          cost_usd?: number
          currency_code?: string
          duration_ms?: number | null
          error_code?: string | null
          finish_reason?: string | null
          function_name: string
          id?: string
          model_id: string
          model_provider?: string
          prompt_template_id?: string | null
          prompt_tokens?: number
          prompt_version?: number | null
          run_id?: string | null
          span_id?: string | null
          tenant_id?: string | null
          total_tokens?: number | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          called_at?: string
          completion_tokens?: number
          cost_usd?: number
          currency_code?: string
          duration_ms?: number | null
          error_code?: string | null
          finish_reason?: string | null
          function_name?: string
          id?: string
          model_id?: string
          model_provider?: string
          prompt_template_id?: string | null
          prompt_tokens?: number
          prompt_version?: number | null
          run_id?: string | null
          span_id?: string | null
          tenant_id?: string | null
          total_tokens?: number | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_llm_call_logs_analysis_id_fkey'
            columns: ['analysis_id']
            isOneToOne: false
            referencedRelation: 'sats_analyses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_llm_call_logs_currency_code_fkey'
            columns: ['currency_code']
            isOneToOne: false
            referencedRelation: 'sats_currencies'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'sats_llm_call_logs_prompt_template_id_fkey'
            columns: ['prompt_template_id']
            isOneToOne: false
            referencedRelation: 'sats_prompt_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_llm_call_logs_run_id_fkey'
            columns: ['run_id']
            isOneToOne: false
            referencedRelation: 'ats_runs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_llm_call_logs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_locales: {
        Row: {
          code: string
          direction: string
          is_active: boolean
          name: string
          native_name: string
        }
        Insert: {
          code: string
          direction?: string
          is_active?: boolean
          name: string
          native_name: string
        }
        Update: {
          code?: string
          direction?: string
          is_active?: boolean
          name?: string
          native_name?: string
        }
        Relationships: []
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
      sats_log_cleanup_policies: {
        Row: {
          auto_cleanup_enabled: boolean | null
          created_at: string | null
          id: string
          max_entries: number | null
          retention_days: number | null
          script_name: string | null
          updated_at: string | null
        }
        Insert: {
          auto_cleanup_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_entries?: number | null
          retention_days?: number | null
          script_name?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_cleanup_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_entries?: number | null
          retention_days?: number | null
          script_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sats_log_entries: {
        Row: {
          created_at: string | null
          id: string
          log_level: string
          message: string
          metadata: Json | null
          request_id: string | null
          script_name: string
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_level: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          script_name: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          log_level?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          script_name?: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sats_log_settings: {
        Row: {
          created_at: string | null
          debug_enabled: boolean | null
          description: string | null
          id: string
          log_level: string | null
          logging_enabled: boolean | null
          script_name: string
          trace_enabled: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          debug_enabled?: boolean | null
          description?: string | null
          id?: string
          log_level?: string | null
          logging_enabled?: boolean | null
          script_name: string
          trace_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          debug_enabled?: boolean | null
          description?: string | null
          id?: string
          log_level?: string | null
          logging_enabled?: boolean | null
          script_name?: string
          trace_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sats_market_signals: {
        Row: {
          created_at: string
          frequency_pct: number
          id: string
          market_code: string
          posting_count: number
          role_family_id: string
          signal_type: string
          signal_value: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          frequency_pct: number
          id?: string
          market_code: string
          posting_count: number
          role_family_id: string
          signal_type: string
          signal_value: string
          updated_at?: string
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          frequency_pct?: number
          id?: string
          market_code?: string
          posting_count?: number
          role_family_id?: string
          signal_type?: string
          signal_value?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_market_signals_role_family_id_fkey'
            columns: ['role_family_id']
            isOneToOne: false
            referencedRelation: 'sats_role_families'
            referencedColumns: ['id']
          },
        ]
      }
      sats_outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_retries: number
          payload: Json
          published_at: string | null
          retry_count: number
          status: string
          tenant_id: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          max_retries?: number
          payload?: Json
          published_at?: string | null
          retry_count?: number
          status?: string
          tenant_id?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          payload?: Json
          published_at?: string | null
          retry_count?: number
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_outbox_events_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          resource: string
          scope: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          resource: string
          scope?: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          resource?: string
          scope?: string
        }
        Relationships: []
      }
      sats_plans: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          currency_code: string
          display_name: string
          id: string
          is_active: boolean
          limits: Json
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          currency?: string
          currency_code?: string
          display_name: string
          id?: string
          is_active?: boolean
          limits?: Json
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          currency_code?: string
          display_name?: string
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_plans_currency_code_fkey'
            columns: ['currency_code']
            isOneToOne: false
            referencedRelation: 'sats_currencies'
            referencedColumns: ['code']
          },
        ]
      }
      sats_profile_fit_reports: {
        Row: {
          cost_estimate_usd: number | null
          created_at: string
          fit_score: number
          gap_items: Json
          gap_snapshot_id: string | null
          id: string
          model_used: string | null
          reconciliation_conflicts: Json | null
          resume_id: string | null
          score_rationale: string | null
          target_market_code: string
          target_role_family_id: string
          user_id: string
        }
        Insert: {
          cost_estimate_usd?: number | null
          created_at?: string
          fit_score: number
          gap_items?: Json
          gap_snapshot_id?: string | null
          id?: string
          model_used?: string | null
          reconciliation_conflicts?: Json | null
          resume_id?: string | null
          score_rationale?: string | null
          target_market_code: string
          target_role_family_id: string
          user_id: string
        }
        Update: {
          cost_estimate_usd?: number | null
          created_at?: string
          fit_score?: number
          gap_items?: Json
          gap_snapshot_id?: string | null
          id?: string
          model_used?: string | null
          reconciliation_conflicts?: Json | null
          resume_id?: string | null
          score_rationale?: string | null
          target_market_code?: string
          target_role_family_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_profile_fit_reports_gap_snapshot_id_fkey'
            columns: ['gap_snapshot_id']
            isOneToOne: false
            referencedRelation: 'sats_gap_snapshots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_profile_fit_reports_target_role_family_id_fkey'
            columns: ['target_role_family_id']
            isOneToOne: false
            referencedRelation: 'sats_role_families'
            referencedColumns: ['id']
          },
        ]
      }
      sats_prompt_templates: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          role: string
          template: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          variables: Json
          version: number
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          role?: string
          template: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json
          version?: number
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          template?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_prompt_templates_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_prompt_templates_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_rag_queries: {
        Row: {
          created_at: string
          feedback_score: number | null
          id: string
          latency_ms: number | null
          query_embedding: string | null
          query_text: string
          retrieval_strategy: string
          retrieved_chunk_ids: string[]
          session_id: string | null
          similarity_scores: number[]
          tenant_id: string | null
          top_k: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_score?: number | null
          id?: string
          latency_ms?: number | null
          query_embedding?: string | null
          query_text: string
          retrieval_strategy?: string
          retrieved_chunk_ids?: string[]
          session_id?: string | null
          similarity_scores?: number[]
          tenant_id?: string | null
          top_k?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_score?: number | null
          id?: string
          latency_ms?: number | null
          query_embedding?: string | null
          query_text?: string
          retrieval_strategy?: string
          retrieved_chunk_ids?: string[]
          session_id?: string | null
          similarity_scores?: number[]
          tenant_id?: string | null
          top_k?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_sats_rag_queries_session'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sats_ai_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_rag_queries_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_rate_limit_counters: {
        Row: {
          count: number
          id: string
          limit_value: number
          resource: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          window_seconds: number
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          limit_value: number
          resource: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          window_seconds: number
          window_start: string
        }
        Update: {
          count?: number
          id?: string
          limit_value?: number
          resource?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          window_seconds?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_rate_limit_counters_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_resume_personas: {
        Row: {
          created_at: string
          created_by: string | null
          custom_summary: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          keyword_highlights: string[] | null
          linked_resume_id: string | null
          persona_name: string
          skill_weights: Json | null
          target_role_family: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_summary?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          keyword_highlights?: string[] | null
          linked_resume_id?: string | null
          persona_name: string
          skill_weights?: Json | null
          target_role_family: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_summary?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          keyword_highlights?: string[] | null
          linked_resume_id?: string | null
          persona_name?: string
          skill_weights?: Json | null
          target_role_family?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_resume_personas_linked_resume_id_fkey'
            columns: ['linked_resume_id']
            isOneToOne: false
            referencedRelation: 'sats_resumes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_resume_personas_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_resumes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_url: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_url?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_url?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_resumes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_roadmap_milestones: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_completed: boolean
          milestone_type: string
          order_index: number
          roadmap_id: string
          skill_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          is_completed?: boolean
          milestone_type: string
          order_index: number
          roadmap_id: string
          skill_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_completed?: boolean
          milestone_type?: string
          order_index?: number
          roadmap_id?: string
          skill_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_roadmap_milestones_roadmap_id_fkey'
            columns: ['roadmap_id']
            isOneToOne: false
            referencedRelation: 'sats_learning_roadmaps'
            referencedColumns: ['id']
          },
        ]
      }
      sats_role_families: {
        Row: {
          aliases: string[]
          created_at: string
          description: string | null
          id: string
          market_codes: string[]
          name: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          description?: string | null
          id?: string
          market_codes?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          description?: string | null
          id?: string
          market_codes?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sats_role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'sats_permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'sats_roles'
            referencedColumns: ['id']
          },
        ]
      }
      sats_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sats_runtime_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sats_skill_decay_config: {
        Row: {
          category: string
          created_at: string
          decay_rate_pct: number
          floor_weight: number
          grace_years: number
          id: string
          no_decay: boolean
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          decay_rate_pct?: number
          floor_weight?: number
          grace_years?: number
          id?: string
          no_decay?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          decay_rate_pct?: number
          floor_weight?: number
          grace_years?: number
          id?: string
          no_decay?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sats_skill_experiences: {
        Row: {
          added_manually: boolean
          analysis_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          job_title: string | null
          keywords: string[] | null
          skill_id: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          added_manually?: boolean
          analysis_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          job_title?: string | null
          keywords?: string[] | null
          skill_id: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          added_manually?: boolean
          analysis_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          job_title?: string | null
          keywords?: string[] | null
          skill_id?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sats_skill_experiences_analysis_id_fkey'
            columns: ['analysis_id']
            isOneToOne: false
            referencedRelation: 'sats_analyses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_skill_experiences_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'sats_companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_skill_experiences_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'sats_skills'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_skill_experiences_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_skill_profiles: {
        Row: {
          ai_classification_version: string | null
          ai_last_used_year: number | null
          career_chapter: string | null
          category: string
          certification_expected_date: string | null
          certification_status: string | null
          created_at: string
          depth: string
          id: string
          skill_name: string
          source_experience_ids: string[]
          transferable_to: string[]
          updated_at: string
          user_confirmed_last_used_year: number | null
          user_context: string | null
          user_id: string
        }
        Insert: {
          ai_classification_version?: string | null
          ai_last_used_year?: number | null
          career_chapter?: string | null
          category: string
          certification_expected_date?: string | null
          certification_status?: string | null
          created_at?: string
          depth: string
          id?: string
          skill_name: string
          source_experience_ids?: string[]
          transferable_to?: string[]
          updated_at?: string
          user_confirmed_last_used_year?: number | null
          user_context?: string | null
          user_id: string
        }
        Update: {
          ai_classification_version?: string | null
          ai_last_used_year?: number | null
          career_chapter?: string | null
          category?: string
          certification_expected_date?: string | null
          certification_status?: string | null
          created_at?: string
          depth?: string
          id?: string
          skill_name?: string
          source_experience_ids?: string[]
          transferable_to?: string[]
          updated_at?: string
          user_confirmed_last_used_year?: number | null
          user_context?: string | null
          user_id?: string
        }
        Relationships: []
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
      sats_staged_jobs: {
        Row: {
          certifications: string[]
          company_name: string | null
          content_hash: string
          created_at: string
          description_normalized: string
          description_raw: string
          error_message: string | null
          fetched_at: string
          id: string
          location_raw: string | null
          market_code: string | null
          methodologies: string[]
          role_family_id: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority_band: string | null
          source: string
          source_url: string
          status: string
          structured_extracted_at: string | null
          title: string
          tools: string[]
          updated_at: string
        }
        Insert: {
          certifications?: string[]
          company_name?: string | null
          content_hash: string
          created_at?: string
          description_normalized: string
          description_raw: string
          error_message?: string | null
          fetched_at?: string
          id?: string
          location_raw?: string | null
          market_code?: string | null
          methodologies?: string[]
          role_family_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority_band?: string | null
          source: string
          source_url: string
          status?: string
          structured_extracted_at?: string | null
          title: string
          tools?: string[]
          updated_at?: string
        }
        Update: {
          certifications?: string[]
          company_name?: string | null
          content_hash?: string
          created_at?: string
          description_normalized?: string
          description_raw?: string
          error_message?: string | null
          fetched_at?: string
          id?: string
          location_raw?: string | null
          market_code?: string | null
          methodologies?: string[]
          role_family_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority_band?: string | null
          source?: string
          source_url?: string
          status?: string
          structured_extracted_at?: string | null
          title?: string
          tools?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_staged_jobs_role_family_id_fkey'
            columns: ['role_family_id']
            isOneToOne: false
            referencedRelation: 'sats_role_families'
            referencedColumns: ['id']
          },
        ]
      }
      sats_tenant_features: {
        Row: {
          config: Json
          enabled_at: string
          enabled_by: string | null
          feature_id: string
          id: string
          is_enabled: boolean
          tenant_id: string
        }
        Insert: {
          config?: Json
          enabled_at?: string
          enabled_by?: string | null
          feature_id: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
        }
        Update: {
          config?: Json
          enabled_at?: string
          enabled_by?: string | null
          feature_id?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_tenant_features_feature_id_fkey'
            columns: ['feature_id']
            isOneToOne: false
            referencedRelation: 'sats_features'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_tenant_features_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_tenants: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          metadata: Json
          name: string
          plan_id: string | null
          settings: Json
          slug: string
          status: string
          storage_quota_bytes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          name: string
          plan_id?: string | null
          settings?: Json
          slug: string
          status?: string
          storage_quota_bytes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          plan_id?: string | null
          settings?: Json
          slug?: string
          status?: string
          storage_quota_bytes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sats_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          locale: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          locale: string
          namespace: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          locale?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_translations_locale_fkey'
            columns: ['locale']
            isOneToOne: false
            referencedRelation: 'sats_locales'
            referencedColumns: ['code']
          },
        ]
      }
      sats_upgrade_requests: {
        Row: {
          created_at: string
          current_tier: string
          id: string
          requested_tier: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier: string
          id?: string
          requested_tier: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier?: string
          id?: string
          requested_tier?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_upgrade_requests_user_id_profiles_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['user_id']
          },
        ]
      }
      sats_user_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          dedupe_key: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_read: boolean
          message: string
          payload: Json
          read_at: string | null
          title: string
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dedupe_key: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dedupe_key?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sats_user_role_assignments: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sats_user_role_assignments_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'sats_roles'
            referencedColumns: ['id']
          },
        ]
      }
      sats_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['app_role']
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database['public']['Enums']['app_role']
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
          user_id?: string
        }
        Relationships: []
      }
      sats_user_skills: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          last_used_date: string | null
          notes: string | null
          proficiency_level: string | null
          skill_id: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_used_date?: string | null
          notes?: string | null
          proficiency_level?: string | null
          skill_id: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_used_date?: string | null
          notes?: string | null
          proficiency_level?: string | null
          skill_id?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'sats_user_skills_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'sats_skills'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sats_user_skills_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
      sats_users_public: {
        Row: {
          auth_user_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          id: string
          name: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          id?: string
          name: string
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
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
      work_experiences: {
        Row: {
          achievements: string[] | null
          action: string
          company_or_project: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
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
          tenant_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          achievements?: string[] | null
          action: string
          company_or_project: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          tenant_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          achievements?: string[] | null
          action?: string
          company_or_project?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          tenant_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'work_experiences_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'sats_tenants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      rjh_v_role_summary: {
        Row: {
          avg_salary_max: number | null
          avg_salary_min: number | null
          first_seen: string | null
          hybrid_pct: number | null
          job_count: number | null
          last_seen: string | null
          most_common_remote_type: string | null
          most_common_seniority: string | null
          remote_pct: number | null
          role_category: string | null
        }
        Relationships: []
      }
      rjh_v_skill_trends: {
        Row: {
          category: string | null
          demand_count: number | null
          month: string | null
          role_category: string | null
          skill: string | null
        }
        Relationships: []
      }
      rjh_v_top_skills: {
        Row: {
          appearances: number | null
          category: string | null
          frequency_score: number | null
          name: string | null
          optional_count: number | null
          required_count: number | null
          required_pct: number | null
          role_category: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_account_deletion: {
        Args: { target_user_id: string }
        Returns: Json
      }
      create_first_admin_role: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_admin_activity_summary: {
        Args: { days_back?: number }
        Returns: Json
      }
      get_admin_dashboard_summary: { Args: never; Returns: Json }
      get_techstack_overview: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database['public']['Enums']['app_role']
          _user_id: string
        }
        Returns: boolean
      }
      invoke_async_ats_scorer: { Args: never; Returns: undefined }
      invoke_fetch_market_jobs: { Args: never; Returns: undefined }
      manage_admin_user: {
        Args: {
          action_type: string
          target_email?: string
          target_user_id?: string
        }
        Returns: Json
      }
      reactivate_soft_deleted_user: {
        Args: { target_user_id: string }
        Returns: Json
      }
      reset_career_data: { Args: { target_user_id: string }; Returns: Json }
      run_log_cleanup_policies: { Args: never; Returns: Json }
      sats_approve_upgrade_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      sats_has_permission: {
        Args: { p_action: string; p_resource: string; p_scope?: string }
        Returns: boolean
      }
      sats_search_document_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_tenant_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          section_heading: string
          similarity: number
          source_id: string
        }[]
      }
      soft_delete_enriched_experience:
        | { Args: { experience_id: string }; Returns: undefined }
        | {
            Args: { deletion_reason?: string; target_experience_id: string }
            Returns: Json
          }
      soft_delete_user: {
        Args: { deletion_reason?: string; target_user_id: string }
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
      validate_admin_session: { Args: never; Returns: Json }
      validate_profile_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'user' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ['user', 'admin'],
    },
  },
} as const
