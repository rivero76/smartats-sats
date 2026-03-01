/**
 * UPDATE LOG
 * 2026-02-25 17:50:00 | P13 Story 2: Added LinkedIn import preparation hook to fetch baseline records and run merge/dedupe logic.
 */
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  ExistingSkillExperience,
  ExistingUserSkill,
  LinkedinImportMergeResult,
  LinkedinPreviewSkill,
  LinkedinPreviewSkillExperience,
  mergeLinkedinImportData,
} from '@/utils/linkedinImportMerge'

interface LinkedinNormalizedPreview {
  normalized_skills: LinkedinPreviewSkill[]
  normalized_skill_experiences: LinkedinPreviewSkillExperience[]
}

interface PrepareLinkedinImportPayload {
  preview: LinkedinNormalizedPreview
  importDate?: string
}

export const usePrepareLinkedinImport = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      preview,
      importDate,
    }: PrepareLinkedinImportPayload): Promise<LinkedinImportMergeResult> => {
      if (!user) throw new Error('Not authenticated')

      const { data: existingUserSkillsData, error: existingUserSkillsError } = await supabase
        .from('sats_user_skills')
        .select(
          `
          id,
          skill_id,
          proficiency_level,
          years_of_experience,
          skill:sats_skills!sats_user_skills_skill_id_fkey(name)
        `
        )
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (existingUserSkillsError) throw existingUserSkillsError

      const existingUserSkills: ExistingUserSkill[] = (existingUserSkillsData || []).map((row) => ({
        id: String(row.id),
        skill_id: String(row.skill_id),
        skill_name: String((row.skill as { name?: string } | null)?.name || ''),
        proficiency_level: row.proficiency_level ? String(row.proficiency_level) : null,
        years_of_experience:
          typeof row.years_of_experience === 'number' ? row.years_of_experience : null,
      }))

      const { data: existingExperiencesData, error: existingExperiencesError } = await supabase
        .from('sats_skill_experiences')
        .select(
          `
          id,
          skill_id,
          job_title,
          description,
          keywords,
          skill:sats_skills!sats_skill_experiences_skill_id_fkey(name)
        `
        )
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (existingExperiencesError) throw existingExperiencesError

      const existingExperiences: ExistingSkillExperience[] = (existingExperiencesData || []).map((row) => ({
        id: String(row.id),
        skill_id: String(row.skill_id),
        skill_name: String((row.skill as { name?: string } | null)?.name || ''),
        job_title: row.job_title ? String(row.job_title) : null,
        description: row.description ? String(row.description) : null,
        keywords: Array.isArray(row.keywords) ? row.keywords.map((keyword) => String(keyword)) : [],
      }))

      return mergeLinkedinImportData({
        proposedSkills: preview.normalized_skills || [],
        proposedExperiences: preview.normalized_skill_experiences || [],
        existingUserSkills,
        existingExperiences,
        importDate,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Unable to prepare LinkedIn import',
        description: error.message || 'Please try again.',
      })
    },
  })
}

