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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          can_edit: boolean
          can_view_financials: boolean
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permissions: Json
          scope_id: string
          scope_type: Database["public"]["Enums"]["grant_scope"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view_financials?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          scope_id: string
          scope_type: Database["public"]["Enums"]["grant_scope"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view_financials?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["grant_scope"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["application_event_type"]
          from_stage_id: string | null
          id: string
          metadata: Json
          note: string | null
          to_stage_id: string | null
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["application_event_type"]
          from_stage_id?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          to_stage_id?: string | null
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["application_event_type"]
          from_stage_id?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          case_assignment_id: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          id: string
          shortlist_override: boolean
          shortlist_override_reason: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          case_assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          shortlist_override?: boolean
          shortlist_override_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          case_assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          shortlist_override?: boolean
          shortlist_override_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "ats_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_candidates: {
        Row: {
          anonymized_at: string | null
          candidate_account_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          headline: string | null
          id: string
          is_anonymized: boolean
          linkedin_url: string | null
          location: string | null
          messengers: Json
          notes: string | null
          phone: string | null
          resume_file_name: string | null
          resume_parsed: Json | null
          resume_text: string | null
          resume_uploaded_at: string | null
          source_id: string | null
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          candidate_account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          headline?: string | null
          id?: string
          is_anonymized?: boolean
          linkedin_url?: string | null
          location?: string | null
          messengers?: Json
          notes?: string | null
          phone?: string | null
          resume_file_name?: string | null
          resume_parsed?: Json | null
          resume_text?: string | null
          resume_uploaded_at?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          candidate_account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          is_anonymized?: boolean
          linkedin_url?: string | null
          location?: string | null
          messengers?: Json
          notes?: string | null
          phone?: string | null
          resume_file_name?: string | null
          resume_parsed?: Json | null
          resume_text?: string | null
          resume_uploaded_at?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_candidates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "candidate_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_communications: {
        Row: {
          application_id: string | null
          batch_id: string | null
          body: string
          candidate_id: string
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["comm_direction"]
          error: string | null
          external_id: string | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["comm_status"]
          subject: string | null
          updated_at: string
          vacancy_id: string | null
        }
        Insert: {
          application_id?: string | null
          batch_id?: string | null
          body: string
          candidate_id: string
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["comm_direction"]
          error?: string | null
          external_id?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_status"]
          subject?: string | null
          updated_at?: string
          vacancy_id?: string | null
        }
        Update: {
          application_id?: string | null
          batch_id?: string | null
          body?: string
          candidate_id?: string
          channel?: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["comm_direction"]
          error?: string | null
          external_id?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_status"]
          subject?: string | null
          updated_at?: string
          vacancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_communications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_communications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "ats_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_communications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_reports: {
        Row: {
          application_id: string | null
          content_md: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["vacancy_prompt_kind"]
          model: string | null
          status: Database["public"]["Enums"]["candidate_report_status"]
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          application_id?: string | null
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["vacancy_prompt_kind"]
          model?: string | null
          status?: Database["public"]["Enums"]["candidate_report_status"]
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          application_id?: string | null
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["vacancy_prompt_kind"]
          model?: string | null
          status?: Database["public"]["Enums"]["candidate_report_status"]
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_reports_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_sources: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          linkedin_url: string | null
          resume_url: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          linkedin_url?: string | null
          resume_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_assignments: {
        Row: {
          assigned_by: string
          candidate_id: string
          case_id: string
          created_at: string
          deadline: string | null
          id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          candidate_id: string
          case_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          candidate_id?: string
          case_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_submissions: {
        Row: {
          answers: Json
          assignment_id: string
          candidate_id: string
          case_id: string
          created_at: string
          id: string
          submitted_at: string
          time_spent_minutes: number | null
        }
        Insert: {
          answers?: Json
          assignment_id: string
          candidate_id: string
          case_id: string
          created_at?: string
          id?: string
          submitted_at?: string
          time_spent_minutes?: number | null
        }
        Update: {
          answers?: Json
          assignment_id?: string
          candidate_id?: string
          case_id?: string
          created_at?: string
          id?: string
          submitted_at?: string
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "case_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_submissions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          company_id: string
          competency_model_id: string | null
          context: string | null
          created_at: string
          created_by: string
          description: string
          difficulty: string
          duration_minutes: number | null
          id: string
          position_title: string | null
          status: string
          tasks: Json
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          competency_model_id?: string | null
          context?: string | null
          created_at?: string
          created_by: string
          description: string
          difficulty?: string
          duration_minutes?: number | null
          id?: string
          position_title?: string | null
          status?: string
          tasks?: Json
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          competency_model_id?: string | null
          context?: string | null
          created_at?: string
          created_by?: string
          description?: string
          difficulty?: string
          duration_minutes?: number | null
          id?: string
          position_title?: string | null
          status?: string
          tasks?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_competency_model_id_fkey"
            columns: ["competency_model_id"]
            isOneToOne: false
            referencedRelation: "competency_models"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_account_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_internal: boolean
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          company_account_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_internal?: boolean
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_account_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_internal?: boolean
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      competencies: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          model_id: string
          name: string
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          model_id: string
          name: string
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          model_id?: string
          name?: string
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competencies_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "competency_models"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_criteria: {
        Row: {
          competency_id: string
          created_at: string | null
          description: string
          id: string
          indicators: string[] | null
          level: number
        }
        Insert: {
          competency_id: string
          created_at?: string | null
          description: string
          id?: string
          indicators?: string[] | null
          level: number
        }
        Update: {
          competency_id?: string
          created_at?: string | null
          description?: string
          id?: string
          indicators?: string[] | null
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "competency_criteria_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_models: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          position_title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position_title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      competency_scores: {
        Row: {
          application_id: string
          competency_id: string
          created_at: string
          id: string
          note: string | null
          score: number
          scored_by: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          competency_id: string
          created_at?: string
          id?: string
          note?: string | null
          score: number
          scored_by?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          competency_id?: string
          created_at?: string
          id?: string
          note?: string | null
          score?: number
          scored_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_scores_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "vacancy_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_registrations: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      hiring_projects: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["hiring_project_status"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["hiring_project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["hiring_project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          assignment_id: string | null
          candidate_id: string
          case_id: string | null
          company_id: string | null
          competency_model_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          interviewer_config: Json | null
          messages: Json
          result: Json | null
          star_evaluations: Json | null
          started_at: string
          status: string
        }
        Insert: {
          assignment_id?: string | null
          candidate_id: string
          case_id?: string | null
          company_id?: string | null
          competency_model_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interviewer_config?: Json | null
          messages?: Json
          result?: Json | null
          star_evaluations?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          assignment_id?: string | null
          candidate_id?: string
          case_id?: string | null
          company_id?: string | null
          competency_model_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interviewer_config?: Json | null
          messages?: Json
          result?: Json | null
          star_evaluations?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "case_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_competency_model_id_fkey"
            columns: ["competency_model_id"]
            isOneToOne: false
            referencedRelation: "competency_models"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          calendar_event_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          interviewer_id: string | null
          meet_link: string | null
          notes: string | null
          organizer_email: string | null
          outcome: Database["public"]["Enums"]["interview_outcome"]
          rating: number | null
          scheduled_at: string | null
          transcript: string | null
          transcript_doc_id: string | null
          transcript_fetched_at: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          interviewer_id?: string | null
          meet_link?: string | null
          notes?: string | null
          organizer_email?: string | null
          outcome?: Database["public"]["Enums"]["interview_outcome"]
          rating?: number | null
          scheduled_at?: string | null
          transcript?: string | null
          transcript_doc_id?: string | null
          transcript_fetched_at?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          interviewer_id?: string | null
          meet_link?: string | null
          notes?: string | null
          organizer_email?: string | null
          outcome?: Database["public"]["Enums"]["interview_outcome"]
          rating?: number | null
          scheduled_at?: string | null
          transcript?: string | null
          transcript_doc_id?: string | null
          transcript_fetched_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          id: string
          offer_sent_at: string | null
          responded_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["offer_status"]
          terms_note: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          offer_sent_at?: string | null
          responded_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms_note?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          offer_sent_at?: string | null
          responded_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_template_items: {
        Row: {
          created_at: string
          id: string
          is_terminal: boolean
          name: string
          position: number
          stage_type: Database["public"]["Enums"]["stage_type"]
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          name: string
          position: number
          stage_type?: Database["public"]["Enums"]["stage_type"]
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          name?: string
          position?: number
          stage_type?: Database["public"]["Enums"]["stage_type"]
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          is_terminal: boolean
          name: string
          position: number
          stage_type: Database["public"]["Enums"]["stage_type"]
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          name: string
          position: number
          stage_type?: Database["public"]["Enums"]["stage_type"]
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          name?: string
          position?: number
          stage_type?: Database["public"]["Enums"]["stage_type"]
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ref_competencies: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          hub_id: string
          id: string
          is_active: boolean
          name: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          hub_id: string
          id?: string
          is_active?: boolean
          name: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          hub_id?: string
          id?: string
          is_active?: boolean
          name?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ref_grades: {
        Row: {
          code: string | null
          created_at: string
          hub_id: string
          id: string
          is_active: boolean
          name: string
          rank: number | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          hub_id: string
          id?: string
          is_active?: boolean
          name: string
          rank?: number | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          hub_id?: string
          id?: string
          is_active?: boolean
          name?: string
          rank?: number | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ref_positions: {
        Row: {
          code: string | null
          created_at: string
          hub_id: string
          id: string
          is_active: boolean
          name: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          hub_id: string
          id?: string
          is_active?: boolean
          name: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          hub_id?: string
          id?: string
          is_active?: boolean
          name?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      rejection_reasons: {
        Row: {
          category: Database["public"]["Enums"]["rejection_category"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["rejection_category"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["rejection_category"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      rejections: {
        Row: {
          application_id: string
          comment: string | null
          created_at: string
          id: string
          is_candidate_initiated: boolean
          reason_code: Database["public"]["Enums"]["rejection_category"]
          reason_id: string | null
          rejected_at: string
          rejected_by: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_candidate_initiated?: boolean
          reason_code?: Database["public"]["Enums"]["rejection_category"]
          reason_id?: string | null
          rejected_at?: string
          rejected_by?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_candidate_initiated?: boolean
          reason_code?: Database["public"]["Enums"]["rejection_category"]
          reason_id?: string | null
          rejected_at?: string
          rejected_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rejections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejections_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
        ]
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
      vacancies: {
        Row: {
          assigned_recruiter_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          grade_ref: string | null
          headcount: number
          hiring_manager_id: string | null
          hiring_project_id: string
          id: string
          is_remote: boolean
          location: string | null
          opened_at: string | null
          position_ref: string | null
          status: Database["public"]["Enums"]["vacancy_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_recruiter_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          grade_ref?: string | null
          headcount?: number
          hiring_manager_id?: string | null
          hiring_project_id: string
          id?: string
          is_remote?: boolean
          location?: string | null
          opened_at?: string | null
          position_ref?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_recruiter_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          grade_ref?: string | null
          headcount?: number
          hiring_manager_id?: string | null
          hiring_project_id?: string
          id?: string
          is_remote?: boolean
          location?: string | null
          opened_at?: string | null
          position_ref?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_grade_ref_fkey"
            columns: ["grade_ref"]
            isOneToOne: false
            referencedRelation: "ref_grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_hiring_project_id_fkey"
            columns: ["hiring_project_id"]
            isOneToOne: false
            referencedRelation: "hiring_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_position_ref_fkey"
            columns: ["position_ref"]
            isOneToOne: false
            referencedRelation: "ref_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_brief_financials: {
        Row: {
          answers: Json
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          updated_by: string | null
          vacancy_brief_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          vacancy_brief_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          vacancy_brief_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_brief_financials_vacancy_brief_id_fkey"
            columns: ["vacancy_brief_id"]
            isOneToOne: true
            referencedRelation: "vacancy_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_briefs: {
        Row: {
          answers: Json
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["vacancy_brief_status"]
          updated_at: string
          updated_by: string | null
          vacancy_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vacancy_brief_status"]
          updated_at?: string
          updated_by?: string | null
          vacancy_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vacancy_brief_status"]
          updated_at?: string
          updated_by?: string | null
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_briefs_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: true
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_competencies: {
        Row: {
          created_at: string
          created_by: string | null
          group_name: string
          group_weight: number
          id: string
          is_must_have: boolean
          name: string
          name_en: string | null
          position: number
          probes: Json
          questions: Json
          red_flags: Json
          rubric: Json
          updated_at: string
          vacancy_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_name: string
          group_weight: number
          id?: string
          is_must_have?: boolean
          name: string
          name_en?: string | null
          position?: number
          probes?: Json
          questions?: Json
          red_flags?: Json
          rubric?: Json
          updated_at?: string
          vacancy_id: string
          weight: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_name?: string
          group_weight?: number
          id?: string
          is_must_have?: boolean
          name?: string
          name_en?: string | null
          position?: number
          probes?: Json
          questions?: Json
          red_flags?: Json
          rubric?: Json
          updated_at?: string
          vacancy_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_competencies_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_financials: {
        Row: {
          agreed_currency: string | null
          agreed_salary: number | null
          commercial_terms: string | null
          created_at: string
          created_by: string | null
          currency: string
          fee_fixed_amount: number | null
          fee_percent: number | null
          fee_type: string | null
          id: string
          invoice_notes: string | null
          salary_max: number | null
          salary_min: number | null
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          agreed_currency?: string | null
          agreed_salary?: number | null
          commercial_terms?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_fixed_amount?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          id?: string
          invoice_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          agreed_currency?: string | null
          agreed_salary?: number | null
          commercial_terms?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_fixed_amount?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          id?: string
          invoice_notes?: string | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_financials_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: true
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["vacancy_prompt_kind"]
          prompt: string
          updated_at: string
          updated_by: string | null
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["vacancy_prompt_kind"]
          prompt: string
          updated_at?: string
          updated_by?: string | null
          vacancy_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["vacancy_prompt_kind"]
          prompt?: string
          updated_at?: string
          updated_by?: string | null
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_prompts_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mp_can_access_application: {
        Args: { p_application_id: string }
        Returns: boolean
      }
      mp_can_access_candidate: {
        Args: { p_candidate_id: string }
        Returns: boolean
      }
      mp_can_access_client: { Args: { p_client_id: string }; Returns: boolean }
      mp_can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      mp_can_access_vacancy: {
        Args: { p_vacancy_id: string }
        Returns: boolean
      }
      mp_can_edit_candidate: {
        Args: { p_candidate_id: string }
        Returns: boolean
      }
      mp_can_edit_project: { Args: { p_project_id: string }; Returns: boolean }
      mp_can_edit_vacancy: { Args: { p_vacancy_id: string }; Returns: boolean }
      mp_can_view_financials_for_client: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      mp_can_view_vacancy_financials: {
        Args: { p_vacancy_id: string }
        Returns: boolean
      }
      mp_is_internal: { Args: never; Returns: boolean }
      mp_is_workspace_admin: { Args: never; Returns: boolean }
      mp_reject_scope_key_change: {
        Args: { p_column: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "company"
        | "candidate"
        | "owner"
        | "recruiter"
        | "assistant"
      application_event_type:
        | "created"
        | "stage_changed"
        | "note_added"
        | "interview_scheduled"
        | "interview_completed"
        | "offer_made"
        | "offer_accepted"
        | "offer_declined"
        | "rejected"
        | "withdrawn"
        | "reactivated"
        | "assessment_linked"
      application_status:
        | "active"
        | "hired"
        | "rejected"
        | "withdrawn"
        | "on_hold"
      candidate_report_status: "generating" | "ready" | "failed"
      client_status: "active" | "prospect" | "archived"
      comm_channel:
        | "email"
        | "telegram"
        | "viber"
        | "whatsapp"
        | "linkedin"
        | "facebook"
        | "phone"
        | "other"
      comm_direction: "out" | "in"
      comm_status: "draft" | "queued" | "sent" | "failed" | "cancelled"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
      grant_scope: "client" | "hiring_project" | "vacancy"
      hiring_project_status:
        | "draft"
        | "active"
        | "on_hold"
        | "closed"
        | "cancelled"
      interview_outcome:
        | "pending"
        | "strong_yes"
        | "yes"
        | "no_decision"
        | "no"
        | "strong_no"
      interview_type:
        | "phone_screen"
        | "technical"
        | "behavioral"
        | "culture_fit"
        | "final"
        | "other"
      offer_status:
        | "draft"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "rescinded"
      rejection_category:
        | "candidate_withdrew"
        | "failed_screening"
        | "failed_interview"
        | "failed_assessment"
        | "compensation_mismatch"
        | "position_closed"
        | "better_candidate"
        | "no_show"
        | "other"
      stage_type:
        | "sourced"
        | "screening"
        | "interview"
        | "assessment"
        | "offer"
        | "hired"
        | "rejected"
      vacancy_brief_status: "draft" | "completed"
      vacancy_prompt_kind: "candidate_report" | "comparative_report"
      vacancy_status:
        | "draft"
        | "open"
        | "on_hold"
        | "filled"
        | "closed"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "admin",
        "company",
        "candidate",
        "owner",
        "recruiter",
        "assistant",
      ],
      application_event_type: [
        "created",
        "stage_changed",
        "note_added",
        "interview_scheduled",
        "interview_completed",
        "offer_made",
        "offer_accepted",
        "offer_declined",
        "rejected",
        "withdrawn",
        "reactivated",
        "assessment_linked",
      ],
      application_status: [
        "active",
        "hired",
        "rejected",
        "withdrawn",
        "on_hold",
      ],
      candidate_report_status: ["generating", "ready", "failed"],
      client_status: ["active", "prospect", "archived"],
      comm_channel: [
        "email",
        "telegram",
        "viber",
        "whatsapp",
        "linkedin",
        "facebook",
        "phone",
        "other",
      ],
      comm_direction: ["out", "in"],
      comm_status: ["draft", "queued", "sent", "failed", "cancelled"],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
      ],
      grant_scope: ["client", "hiring_project", "vacancy"],
      hiring_project_status: [
        "draft",
        "active",
        "on_hold",
        "closed",
        "cancelled",
      ],
      interview_outcome: [
        "pending",
        "strong_yes",
        "yes",
        "no_decision",
        "no",
        "strong_no",
      ],
      interview_type: [
        "phone_screen",
        "technical",
        "behavioral",
        "culture_fit",
        "final",
        "other",
      ],
      offer_status: [
        "draft",
        "sent",
        "accepted",
        "declined",
        "expired",
        "rescinded",
      ],
      rejection_category: [
        "candidate_withdrew",
        "failed_screening",
        "failed_interview",
        "failed_assessment",
        "compensation_mismatch",
        "position_closed",
        "better_candidate",
        "no_show",
        "other",
      ],
      stage_type: [
        "sourced",
        "screening",
        "interview",
        "assessment",
        "offer",
        "hired",
        "rejected",
      ],
      vacancy_brief_status: ["draft", "completed"],
      vacancy_prompt_kind: ["candidate_report", "comparative_report"],
      vacancy_status: [
        "draft",
        "open",
        "on_hold",
        "filled",
        "closed",
        "cancelled",
      ],
    },
  },
} as const
