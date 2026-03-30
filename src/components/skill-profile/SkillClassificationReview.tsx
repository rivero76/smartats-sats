/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S3 — SkillClassificationReview transparency UI component.
 *   Shows AI classification results to the user before saving. Renders career chapters,
 *   per-skill override choices (3 options), re-classification on "explain" flow,
 *   and a diff summary for re-ingestion mode. Never shows raw weight numbers.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { staggerContainer, listItem, slideUp } from '@/lib/animations'
import { useSaveSkillProfiles, type SaveSkillProfileInput } from '@/hooks/useSkillProfile'

// ---------------------------------------------------------------------------
// Types (mirror classify-skill-profile edge function response shape)
// ---------------------------------------------------------------------------

export interface ClassifiedSkill {
  skill_name: string
  category: 'technical' | 'soft' | 'leadership' | 'domain' | 'certification' | 'methodology'
  depth: 'awareness' | 'practitioner' | 'expert' | 'trainer'
  last_used_year: number
  transferable_to: string[]
  career_chapter: string
}

export interface CareerChapter {
  label: string
  start_year: number
  end_year: number | null
}

export interface ClassifyDiff {
  new_skills: ClassifiedSkill[]
  updated_skills: ClassifiedSkill[]
  unchanged_skills: ClassifiedSkill[]
}

interface SkillOverrideState {
  type: 'active' | 'foundation' | 'context'
  userContext?: string
  reclassified?: ClassifiedSkill // updated skill after "explain" re-classification
}

interface Props {
  classifiedSkills: ClassifiedSkill[]
  careerChapters: CareerChapter[]
  diff?: ClassifyDiff
  /** Called with final merged skill list after user confirms */
  onConfirm: (skills: SaveSkillProfileInput[]) => void
  onCancel: () => void
  /** Set true for Pro/Max users; false shows upgrade prompt for "explain" option */
  canReclassify?: boolean
  /** Injected for "explain" re-classification call; returns updated skill or null on failure */
  onReclassify?: (skill: ClassifiedSkill, context: string) => Promise<ClassifiedSkill | null>
}

// ---------------------------------------------------------------------------
// Badge helpers
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
// Single skill row with override choices
// ---------------------------------------------------------------------------

function SkillRow({
  skill,
  override,
  onOverrideChange,
  canReclassify,
  onReclassify,
}: {
  skill: ClassifiedSkill
  override: SkillOverrideState
  onOverrideChange: (o: SkillOverrideState) => void
  canReclassify: boolean
  onReclassify?: (skill: ClassifiedSkill, context: string) => Promise<ClassifiedSkill | null>
}) {
  const [contextDraft, setContextDraft] = useState('')
  const [reclassifying, setReclassifying] = useState(false)
  const [reclassifyError, setReclassifyError] = useState<string | null>(null)

  const displaySkill = override.reclassified ?? skill

  const handleReclassify = async () => {
    if (!onReclassify || !contextDraft.trim()) return
    setReclassifying(true)
    setReclassifyError(null)
    try {
      const updated = await onReclassify(skill, contextDraft.trim())
      if (updated) {
        onOverrideChange({
          type: 'context',
          userContext: contextDraft.trim(),
          reclassified: updated,
        })
      } else {
        setReclassifyError('Re-classification returned no changes. Your context is saved.')
        onOverrideChange({ type: 'context', userContext: contextDraft.trim() })
      }
    } catch {
      setReclassifyError('Re-classification failed. Your context is still saved.')
      onOverrideChange({ type: 'context', userContext: contextDraft.trim() })
    } finally {
      setReclassifying(false)
    }
  }

  return (
    <motion.div
      variants={listItem}
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      {/* Skill header */}
      <div className="flex flex-wrap items-start gap-2">
        <span className="font-medium text-sm">{displaySkill.skill_name}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOURS[displaySkill.category] ?? ''}`}
        >
          {displaySkill.category}
        </span>
        <Badge variant="outline" className="text-xs">
          {DEPTH_LABEL[displaySkill.depth]}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          Last used: {displaySkill.last_used_year}
        </span>
      </div>

      {/* Transferable skills */}
      {displaySkill.transferable_to.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Transferable:</span>
          {displaySkill.transferable_to.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Override radio choices */}
      <fieldset className="space-y-2" aria-label={`Override options for ${skill.skill_name}`}>
        <legend className="sr-only">How does this skill apply to you today?</legend>

        {/* Option 1 — still active */}
        <label className="flex items-start gap-2 cursor-pointer group">
          <input
            type="radio"
            name={`override-${skill.skill_name}`}
            value="active"
            checked={override.type === 'active'}
            onChange={() => onOverrideChange({ type: 'active', userContext: override.userContext })}
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm group-hover:text-foreground text-muted-foreground">
            I still actively use this skill
          </span>
        </label>

        {/* Option 2 — foundation only */}
        <label className="flex items-start gap-2 cursor-pointer group">
          <input
            type="radio"
            name={`override-${skill.skill_name}`}
            value="foundation"
            checked={override.type === 'foundation'}
            onChange={() =>
              onOverrideChange({ type: 'foundation', userContext: override.userContext })
            }
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm group-hover:text-foreground text-muted-foreground">
            Foundation only — I've moved on from this
          </span>
        </label>

        {/* Option 3 — explain (Pro/Max gated) */}
        <label className="flex items-start gap-2 cursor-pointer group">
          <input
            type="radio"
            name={`override-${skill.skill_name}`}
            value="context"
            checked={override.type === 'context'}
            onChange={() => {
              if (!canReclassify) return
              onOverrideChange({ type: 'context', reclassified: override.reclassified })
            }}
            className="mt-0.5 accent-primary"
            disabled={!canReclassify}
          />
          <span
            className={`text-sm ${canReclassify ? 'group-hover:text-foreground text-muted-foreground' : 'text-muted-foreground/50'}`}
          >
            More relevant than it looks — let me explain
            {!canReclassify && (
              <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(Pro / Max)</span>
            )}
          </span>
        </label>

        {/* Context textarea — shown when option 3 selected */}
        {override.type === 'context' && canReclassify && (
          <div className="ml-5 space-y-2">
            <Textarea
              placeholder="Describe how this skill is relevant to your current work or target role..."
              value={contextDraft}
              onChange={(e) => setContextDraft(e.target.value)}
              className="text-sm min-h-[80px]"
              aria-label="Additional context for skill re-classification"
            />
            {override.reclassified && (
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Re-classified — skill updated above
              </p>
            )}
            {reclassifyError && (
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {reclassifyError}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReclassify}
              disabled={!contextDraft.trim() || reclassifying}
            >
              {reclassifying && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {reclassifying ? 'Re-classifying…' : 'Re-classify with my context'}
            </Button>
          </div>
        )}
      </fieldset>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Chapter section
// ---------------------------------------------------------------------------

function ChapterSection({
  label,
  skills,
  overrides,
  onOverrideChange,
  canReclassify,
  onReclassify,
}: {
  label: string
  skills: ClassifiedSkill[]
  overrides: Record<string, SkillOverrideState>
  onOverrideChange: (skillName: string, o: SkillOverrideState) => void
  canReclassify: boolean
  onReclassify?: Props['onReclassify']
}) {
  const [open, setOpen] = useState(true)
  const displaySkills = skills.slice(0, 10) // cap stagger at 10

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left font-semibold text-sm py-1 hover:text-primary transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {label}
        <Badge variant="secondary" className="ml-auto">
          {skills.length}
        </Badge>
      </button>

      {open && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2 pl-2"
        >
          {displaySkills.map((skill) => (
            <SkillRow
              key={skill.skill_name}
              skill={skill}
              override={overrides[skill.skill_name] ?? { type: 'foundation' }}
              onOverrideChange={(o) => onOverrideChange(skill.skill_name, o)}
              canReclassify={canReclassify}
              onReclassify={onReclassify}
            />
          ))}
          {skills.length > 10 && (
            <p className="text-xs text-muted-foreground pl-1">
              + {skills.length - 10} more skills — edit individually from the Skill Profile page in
              Settings.
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SkillClassificationReview({
  classifiedSkills,
  careerChapters,
  diff,
  onConfirm,
  onCancel,
  canReclassify = false,
  onReclassify,
}: Props) {
  const CLASSIFICATION_VERSION = '1.0.0'

  // Build initial override state — default to "foundation" for all skills
  const [overrides, setOverrides] = useState<Record<string, SkillOverrideState>>(() => {
    const initial: Record<string, SkillOverrideState> = {}
    classifiedSkills.forEach((s) => {
      initial[s.skill_name] = { type: 'foundation' }
    })
    return initial
  })

  const saveSkillProfiles = useSaveSkillProfiles()

  // Determine which skills to display (diff mode vs full)
  const skillsToReview = diff ? [...diff.new_skills, ...diff.updated_skills] : classifiedSkills

  // Group by chapter
  const byChapter = skillsToReview.reduce<Record<string, ClassifiedSkill[]>>((acc, s) => {
    const ch = s.career_chapter || 'Uncategorised'
    if (!acc[ch]) acc[ch] = []
    acc[ch].push(s)
    return acc
  }, {})

  const transferableCount = classifiedSkills.reduce((n, s) => n + s.transferable_to.length, 0)

  const handleOverrideChange = (skillName: string, o: SkillOverrideState) => {
    setOverrides((prev) => ({ ...prev, [skillName]: o }))
  }

  const handleConfirm = () => {
    const inputs: SaveSkillProfileInput[] = classifiedSkills.map((skill) => {
      const ov = overrides[skill.skill_name] ?? { type: 'foundation' }
      const displaySkill = ov.reclassified ?? skill
      return {
        skill_name: displaySkill.skill_name,
        category: displaySkill.category,
        depth: displaySkill.depth,
        ai_last_used_year: displaySkill.last_used_year,
        transferable_to: displaySkill.transferable_to,
        career_chapter: displaySkill.career_chapter,
        ai_classification_version: CLASSIFICATION_VERSION,
        user_confirmed_last_used_year: ov.type === 'active' ? new Date().getFullYear() : null,
        user_context: ov.userContext ?? null,
      }
    })
    onConfirm(inputs)
  }

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
      role="region"
      aria-label="Skill classification review"
    >
      {/* Summary banner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Here's what we found in your experience</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            We identified{' '}
            <strong>
              {careerChapters.length} career chapter{careerChapters.length !== 1 ? 's' : ''}
            </strong>{' '}
            and <strong>{classifiedSkills.length} skills</strong>.
          </p>
          {transferableCount > 0 && (
            <p>
              From your technical roles, we also extracted{' '}
              <strong>{transferableCount} transferable skills</strong> — soft and leadership
              capabilities that carry forward regardless of how long ago the role was.
            </p>
          )}
          {diff && (
            <p className="text-foreground font-medium mt-2">
              Re-ingestion summary: {diff.new_skills.length} new · {diff.updated_skills.length}{' '}
              updated · {diff.unchanged_skills.length} unchanged
            </p>
          )}
          <p className="mt-2 text-foreground/70">
            Review the classifications below. For each skill, tell us how it applies to you today —
            then confirm to save.
          </p>
        </CardContent>
      </Card>

      {/* Skills by chapter */}
      <div className="space-y-4">
        {Object.entries(byChapter).map(([chapter, skills]) => (
          <ChapterSection
            key={chapter}
            label={chapter}
            skills={skills}
            overrides={overrides}
            onOverrideChange={handleOverrideChange}
            canReclassify={canReclassify}
            onReclassify={onReclassify}
          />
        ))}
      </div>

      {/* Unchanged skills summary (diff mode only) */}
      {diff && diff.unchanged_skills.length > 0 && (
        <p className="text-sm text-muted-foreground border rounded-md px-4 py-2">
          {diff.unchanged_skills.length} skill{diff.unchanged_skills.length !== 1 ? 's' : ''}{' '}
          unchanged — no review needed.
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saveSkillProfiles.isPending}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={saveSkillProfiles.isPending}>
          {saveSkillProfiles.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saveSkillProfiles.isPending ? 'Saving…' : 'Looks good — save my skill profile'}
        </Button>
      </div>
    </motion.div>
  )
}
