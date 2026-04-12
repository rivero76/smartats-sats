/**
 * UPDATE LOG
 * 2026-04-12 00:00:00 | P-INTERVIEW S1+S2 — TanStack Query hook for Interview Intelligence.
 *   useInterviewSession: loads existing prep session for an analysis_id.
 *   useGenerateInterviewPrep: mutation that triggers the generate-interview-prep edge function.
 *   Tier gating enforced client-side (Pro+) before network call.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { usePlanFeature } from '@/hooks/usePlanFeature'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StarScaffold {
  situation: string
  task: string
  action: string
  result: string
  risk_flag: 'green' | 'amber' | 'red'
  risk_note: string | null
}

export interface InterviewQuestion {
  id: string
  category:
    | 'behavioural'
    | 'gap_bridge'
    | 'role_specific'
    | 'company_values'
    | 'technical_deep_dive'
  question: string
  why_asked: string
  difficulty: 'standard' | 'tough' | 'curveball'
  source_evidence_skill: string | null
  star_scaffold: StarScaffold | null
}

export interface CompanyDossier {
  stated_values: string[]
  cultural_keywords: string[]
  strategic_themes: string[]
  hiring_language_style: 'formal' | 'collaborative' | 'entrepreneurial' | 'corporate'
  red_flags: string[]
}

export interface RoleDecoder {
  implicit_seniority: string
  primary_deliverables: string[]
  reporting_level: string
  team_scope: string
  soft_skill_priorities: string[]
  candidate_risk_areas: string[]
}

export interface InterviewPrepSession {
  id: string
  user_id: string
  analysis_id: string
  job_description_id: string | null
  generated_at: string
  company_dossier: CompanyDossier | null
  role_decoder: RoleDecoder | null
  questions: InterviewQuestion[]
  scrape_status: 'success' | 'partial' | 'failed'
  session_version: number
  model_used: string | null
  cost_estimate_usd: number | null
}

export interface GenerateInterviewPrepParams {
  analysisId: string
  forceRegenerate?: boolean
}

export interface GenerateInterviewPrepResponse {
  session_id: string
  cached: boolean
  question_count?: number
  scrape_status?: string
}

export class InterviewPrepPlanGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InterviewPrepPlanGateError'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFunctionsUrl(): string {
  const supabaseUrlRaw = (supabase as any).supabaseUrl as string
  return supabaseUrlRaw.replace('.supabase.co', '.functions.supabase.co')
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Loads an existing interview prep session for a given analysis_id.
 * Returns null if no session exists yet.
 */
export function useInterviewSession(analysisId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['interview-prep-session', analysisId, user?.id],
    queryFn: async (): Promise<InterviewPrepSession | null> => {
      if (!user || !analysisId) return null

      const { data, error } = await supabase
        .from('sats_interview_prep_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('analysis_id', analysisId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        ...data,
        questions: (data.questions as unknown as InterviewQuestion[]) ?? [],
        company_dossier: (data.company_dossier as unknown as CompanyDossier) ?? null,
        role_decoder: (data.role_decoder as unknown as RoleDecoder) ?? null,
        scrape_status: (data.scrape_status ?? 'success') as InterviewPrepSession['scrape_status'],
      }
    },
    enabled: !!user && !!analysisId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetches all interview prep sessions for the current user (for listing).
 */
export function useAllInterviewSessions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['interview-prep-sessions-all', user?.id],
    queryFn: async (): Promise<InterviewPrepSession[]> => {
      if (!user) return []

      const { data, error } = await supabase
        .from('sats_interview_prep_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => ({
        ...row,
        questions: (row.questions as unknown as InterviewQuestion[]) ?? [],
        company_dossier: (row.company_dossier as unknown as CompanyDossier) ?? null,
        role_decoder: (row.role_decoder as unknown as RoleDecoder) ?? null,
        scrape_status: (row.scrape_status ?? 'success') as InterviewPrepSession['scrape_status'],
      }))
    },
    enabled: !!user,
  })
}

/**
 * Mutation that triggers interview prep generation via the edge function.
 * Throws InterviewPrepPlanGateError if user is not on Pro+.
 * Invalidates the session query on success.
 */
export function useGenerateInterviewPrep() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hasFeature } = usePlanFeature()

  return useMutation({
    mutationFn: async (
      params: GenerateInterviewPrepParams
    ): Promise<GenerateInterviewPrepResponse> => {
      if (!hasFeature('interview_prep')) {
        throw new InterviewPrepPlanGateError('Interview Intelligence requires a Pro plan or above.')
      }

      if (!user) throw new Error('Not authenticated')

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('No active session')

      const functionsUrl = getFunctionsUrl()
      const response = await fetch(`${functionsUrl}/functions/v1/generate-interview-prep`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysis_id: params.analysisId,
          force_regenerate: params.forceRegenerate ?? false,
        }),
      })

      const responsePayload = await response.json()

      if (!response.ok || !responsePayload.success) {
        throw new Error(
          responsePayload.error || `Interview prep generation failed (${response.status})`
        )
      }

      return responsePayload as GenerateInterviewPrepResponse
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({
        queryKey: ['interview-prep-session', params.analysisId, user?.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['interview-prep-sessions-all', user?.id],
      })

      if (!data.cached) {
        toast({
          title: 'Interview prep ready',
          description: `${data.question_count ?? 'Your'} personalised questions generated.`,
        })
      }
    },
    onError: (error: Error) => {
      if (error instanceof InterviewPrepPlanGateError) {
        toast({
          variant: 'destructive',
          title: 'Pro plan required',
          description: error.message,
        })
        return
      }
      toast({
        variant: 'destructive',
        title: 'Could not generate interview prep',
        description: error.message,
      })
    },
  })
}
