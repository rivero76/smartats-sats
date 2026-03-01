// Updated: 2026-03-01 00:00:00 - P13 Story 3: Created HITL review modal for LinkedIn import with skill/experience selection and sequential DB save flow.

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  LinkedinImportMergeResult,
  canonicalizeSkillName,
} from '@/utils/linkedinImportMerge'

interface ProfileImportReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mergeResult: LinkedinImportMergeResult
  importDate: string
}

export function ProfileImportReviewModal({
  isOpen,
  onClose,
  onSuccess,
  mergeResult,
  importDate,
}: ProfileImportReviewModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [selectedSkillNames, setSelectedSkillNames] = useState<Set<string>>(
    () => new Set(mergeResult.skills_to_insert.map((s) => s.skill_name))
  )
  const [selectedExpIndexes, setSelectedExpIndexes] = useState<Set<number>>(
    () => new Set(mergeResult.experiences_to_insert.map((_, i) => i))
  )
  const [isSaving, setIsSaving] = useState(false)

  const toggleSkill = (skillName: string) => {
    setSelectedSkillNames((prev) => {
      const next = new Set(prev)
      if (next.has(skillName)) next.delete(skillName)
      else next.add(skillName)
      return next
    })
  }

  const toggleExp = (index: number) => {
    setSelectedExpIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const checkedSkillCount = selectedSkillNames.size
  const checkedExpCount = selectedExpIndexes.size

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      // 1. Collect checked items
      const checkedSkills = mergeResult.skills_to_insert.filter((s) =>
        selectedSkillNames.has(s.skill_name)
      )
      const checkedExps = mergeResult.experiences_to_insert.filter((_, i) =>
        selectedExpIndexes.has(i)
      )

      // 2. Collect all canonical names needed
      const neededNamesSet = new Set<string>()
      for (const s of checkedSkills) {
        const c = canonicalizeSkillName(s.skill_name)
        if (c) neededNamesSet.add(c)
      }
      for (const e of checkedExps) {
        const c = canonicalizeSkillName(e.skill_name)
        if (c) neededNamesSet.add(c)
      }
      const neededNames = Array.from(neededNamesSet)

      // 3. Resolve sats_skills IDs
      const skillIdMap = new Map<string, string>()

      if (neededNames.length > 0) {
        const { data: existingSkills, error: selectError } = await supabase
          .from('sats_skills')
          .select('id, name')
          .in('name', neededNames)

        if (selectError) throw selectError

        for (const row of existingSkills || []) {
          skillIdMap.set(row.name, String(row.id))
        }

        const missingNames = neededNames.filter((n) => !skillIdMap.has(n))

        if (missingNames.length > 0) {
          const insertResults = await Promise.all(
            missingNames.map((name) =>
              supabase
                .from('sats_skills')
                .insert({ name })
                .select('id, name')
                .single()
            )
          )
          for (const result of insertResults) {
            if (result.error) throw result.error
            if (result.data) {
              skillIdMap.set(result.data.name, String(result.data.id))
            }
          }
        }
      }

      // 4. Batch insert sats_user_skills
      if (checkedSkills.length > 0) {
        const userSkillRows = checkedSkills.map((s) => {
          const canonical = canonicalizeSkillName(s.skill_name)
          const skillId = skillIdMap.get(canonical)
          if (!skillId) throw new Error(`Could not resolve skill ID for "${s.skill_name}"`)
          return {
            skill_id: skillId,
            user_id: user.id,
            proficiency_level: s.proficiency_level,
            years_of_experience: s.years_of_experience,
            last_used_date: s.last_used_date,
            notes: s.notes
              ? `${s.notes} [imported from LinkedIn ${importDate}]`
              : `[imported from LinkedIn ${importDate}]`,
          }
        })

        const { error: skillInsertError } = await supabase
          .from('sats_user_skills')
          .insert(userSkillRows)

        if (skillInsertError) throw skillInsertError
      }

      // 5. Batch insert sats_skill_experiences
      if (checkedExps.length > 0) {
        const expRows = checkedExps.map((e) => {
          const canonical = canonicalizeSkillName(e.skill_name)
          const skillId = skillIdMap.get(canonical)
          if (!skillId) throw new Error(`Could not resolve skill ID for "${e.skill_name}"`)
          return {
            skill_id: skillId,
            user_id: user.id,
            job_title: e.job_title,
            description: e.description,
            keywords: e.keywords,
            added_manually: false,
          }
        })

        const { error: expInsertError } = await supabase
          .from('sats_skill_experiences')
          .insert(expRows)

        if (expInsertError) throw expInsertError
      }

      // 6. Success
      toast({ title: 'Import complete', description: 'Your profile has been updated.' })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please try again.'
      toast({ variant: 'destructive', title: 'Save failed', description: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const hasAnythingToReview =
    mergeResult.skills_to_insert.length > 0 ||
    mergeResult.skills_to_merge.length > 0 ||
    mergeResult.skills_ignored.length > 0 ||
    mergeResult.experiences_to_insert.length > 0 ||
    mergeResult.experiences_ignored.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review LinkedIn Import</DialogTitle>
          <DialogDescription>
            Select which skills and experiences to add to your profile.
          </DialogDescription>
        </DialogHeader>

        {!hasAnythingToReview ? (
          <Alert>
            <AlertDescription>
              No new skills or experiences were found in the LinkedIn import. Your profile is
              already up to date.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {checkedSkillCount} skill{checkedSkillCount !== 1 ? 's' : ''} and {checkedExpCount}{' '}
              experience{checkedExpCount !== 1 ? 's' : ''} selected to import.
            </p>

            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-6">
                {/* Skills Section */}
                {(mergeResult.skills_to_insert.length > 0 ||
                  mergeResult.skills_to_merge.length > 0 ||
                  mergeResult.skills_ignored.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Skills</h3>

                    {mergeResult.skills_to_insert.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          New skills to add
                        </p>
                        {mergeResult.skills_to_insert.map((skill) => (
                          <div
                            key={skill.skill_name}
                            className="flex items-center gap-3 py-1"
                          >
                            <Checkbox
                              id={`skill-${skill.skill_name}`}
                              checked={selectedSkillNames.has(skill.skill_name)}
                              onCheckedChange={() => toggleSkill(skill.skill_name)}
                            />
                            <Label
                              htmlFor={`skill-${skill.skill_name}`}
                              className="flex-1 cursor-pointer"
                            >
                              {skill.skill_name}
                            </Label>
                            {skill.proficiency_level && (
                              <Badge variant="outline" className="text-xs">
                                {skill.proficiency_level}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {mergeResult.skills_to_merge.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Similar to existing (kept as-is)
                          </p>
                          {mergeResult.skills_to_merge.map((flag) => (
                            <div
                              key={flag.proposed_skill_name}
                              className="flex items-center gap-3 py-1 text-muted-foreground"
                            >
                              <div className="w-4 h-4 flex-shrink-0" />
                              <span className="flex-1 text-sm">{flag.proposed_skill_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                Matches existing
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {mergeResult.skills_ignored.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Skipped
                          </p>
                          {mergeResult.skills_ignored.map((flag) => (
                            <div
                              key={flag.proposed_skill_name}
                              className="flex items-center gap-3 py-1 text-muted-foreground opacity-60"
                            >
                              <div className="w-4 h-4 flex-shrink-0" />
                              <span className="flex-1 text-sm">{flag.proposed_skill_name}</span>
                              <span className="text-xs">Already exists</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Experiences Section */}
                {(mergeResult.experiences_to_insert.length > 0 ||
                  mergeResult.experiences_ignored.length > 0) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Experiences</h3>

                      {mergeResult.experiences_to_insert.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            New experiences to add
                          </p>
                          {mergeResult.experiences_to_insert.map((exp, i) => (
                            <div key={i} className="flex items-start gap-3 py-1">
                              <Checkbox
                                id={`exp-${i}`}
                                checked={selectedExpIndexes.has(i)}
                                onCheckedChange={() => toggleExp(i)}
                                className="mt-0.5"
                              />
                              <Label htmlFor={`exp-${i}`} className="flex-1 cursor-pointer">
                                <span className="font-medium">{exp.skill_name}</span>
                                {exp.job_title && (
                                  <span className="text-muted-foreground">
                                    {' '}— {exp.job_title}
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {mergeResult.experiences_ignored.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                              Skipped
                            </p>
                            {mergeResult.experiences_ignored.map((flag, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 py-1 text-muted-foreground opacity-60"
                              >
                                <div className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-sm">{flag.proposed_skill_name}</span>
                                <span className="text-xs">Duplicate</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {hasAnythingToReview && (
            <Button
              onClick={handleSave}
              disabled={isSaving || (checkedSkillCount === 0 && checkedExpCount === 0)}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve and Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
