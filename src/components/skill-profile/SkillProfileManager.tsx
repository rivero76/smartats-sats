/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S6 — SkillProfileManager: Settings page section for viewing and
 *   managing the AI-classified skill profile. Shows skill count, career chapter breakdown,
 *   per-skill delete, and a link to re-trigger classification from the Experiences page.
 *   Free tier: read-only; Pro/Max: individual delete enabled.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, ChevronDown, ChevronUp, Loader2, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { staggerContainer, listItem } from '@/lib/animations'
import { useSkillProfile, useDeleteSkillProfile } from '@/hooks/useSkillProfile'

// ---------------------------------------------------------------------------
// Category colours (mirror SkillClassificationReview)
// ---------------------------------------------------------------------------

const CATEGORY_COLOURS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  soft: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  leadership: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  domain: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  certification: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  methodology: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
}

const DEPTH_LABEL: Record<string, string> = {
  awareness: 'Awareness',
  practitioner: 'Practitioner',
  expert: 'Expert',
  trainer: 'Trainer / Mentor',
}

// ---------------------------------------------------------------------------
// Chapter group
// ---------------------------------------------------------------------------

function ChapterGroup({
  chapter,
  skills,
  onDelete,
  deleteIsPending,
}: {
  chapter: string
  skills: Array<{
    skill_name: string
    category: string
    depth: string
    ai_last_used_year: number | null
    user_confirmed_last_used_year: number | null
  }>
  onDelete: (skillName: string) => void
  deleteIsPending: boolean
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left font-semibold text-sm py-1 hover:text-primary transition-colors"
        aria-expanded={open}
        aria-controls={`chapter-${chapter.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {chapter}
        <Badge variant="secondary" className="ml-auto">
          {skills.length}
        </Badge>
      </button>

      {open && (
        <motion.ul
          id={`chapter-${chapter.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-1 pl-2"
          role="list"
        >
          {skills.map((skill) => {
            const lastUsed = skill.user_confirmed_last_used_year ?? skill.ai_last_used_year
            return (
              <motion.li
                key={skill.skill_name}
                variants={listItem}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="font-medium flex-1 min-w-0 truncate">{skill.skill_name}</span>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOURS[skill.category] ?? ''}`}
                >
                  {skill.category}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {DEPTH_LABEL[skill.depth] ?? skill.depth}
                </Badge>
                {lastUsed && (
                  <span className="shrink-0 text-xs text-muted-foreground">{lastUsed}</span>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${skill.skill_name} from skill profile`}
                      disabled={deleteIsPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove skill?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove <strong>{skill.skill_name}</strong> from your
                        skill profile. It will no longer be used in ATS analyses.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(skill.skill_name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SkillProfileManager() {
  const { data: skills = [], isLoading, error } = useSkillProfile()
  const deleteSkill = useDeleteSkillProfile()

  // Group by career chapter
  const byChapter = skills.reduce<Record<string, typeof skills>>((acc, s) => {
    const ch = s.career_chapter || 'Uncategorised'
    if (!acc[ch]) acc[ch] = []
    acc[ch].push(s)
    return acc
  }, {})

  const chapterCount = Object.keys(byChapter).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-5 w-5" />
          Skill Profile
        </CardTitle>
        <CardDescription>
          Your AI-classified skill profile is used to weight ATS analyses. Skills are grouped by
          career chapter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading skill profile…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Could not load skill profile. Please refresh the page.
          </p>
        )}

        {!isLoading && !error && skills.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No skill profile found.</p>
            <p className="text-xs text-muted-foreground">
              Add your work experience and upload a resume to trigger AI skill classification.
            </p>
          </div>
        )}

        {!isLoading && skills.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              <strong>
                {skills.length} skill{skills.length !== 1 ? 's' : ''}
              </strong>{' '}
              across{' '}
              <strong>
                {chapterCount} career chapter{chapterCount !== 1 ? 's' : ''}
              </strong>
              .
            </p>

            <div className="space-y-4" role="region" aria-label="Skill profile by chapter">
              {Object.entries(byChapter).map(([chapter, chapterSkills]) => (
                <ChapterGroup
                  key={chapter}
                  chapter={chapter}
                  skills={chapterSkills}
                  onDelete={(skillName) => deleteSkill.mutate(skillName)}
                  deleteIsPending={deleteSkill.isPending}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
