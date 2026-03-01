/**
 * UPDATE LOG
 * 2026-02-25 17:35:00 | P13 Story 2: Added LinkedIn import dedupe/merge utility with fuzzy skill matching and provenance metadata tagging.
 * 2026-03-01 17:08:32 | Fix experience fingerprint asymmetry: removed companyName from proposed-experience fingerprint so both sides use the same fields (canonical skill + job title + description). sats_skill_experiences has no company_name text column so it cannot be included symmetrically.
 */

export interface LinkedinPreviewSkill {
  skill_name: string
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | null
  years_of_experience: number | null
  last_used_date: string | null
  notes: string | null
  source: 'linkedin'
  import_date: string
}

export interface LinkedinPreviewSkillExperience {
  skill_name: string
  job_title: string | null
  company_name: string | null
  description: string
  keywords: string[]
  source: 'linkedin'
  import_date: string
}

export interface ExistingUserSkill {
  id: string
  skill_id: string
  skill_name: string
  proficiency_level: string | null
  years_of_experience: number | null
}

export interface ExistingSkillExperience {
  id: string
  skill_id: string
  skill_name: string
  job_title: string | null
  description: string | null
  keywords: string[] | null
}

export interface ImportProvenance {
  source: 'linkedin'
  import_date: string
}

export interface PreparedUserSkill {
  skill_name: string
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | null
  years_of_experience: number | null
  last_used_date: string | null
  notes: string | null
  provenance: ImportProvenance
}

export interface PreparedSkillExperience {
  skill_name: string
  job_title: string | null
  company_name: string | null
  description: string
  keywords: string[]
  provenance: ImportProvenance
}

interface MergeFlagBase {
  proposed_skill_name: string
  canonical_skill_name: string
  reason: string
  matched_existing_skill_name?: string
  similarity_score?: number
}

export interface SkillMergeFlag extends MergeFlagBase {
  kind: 'merge'
  existing_user_skill_id: string
}

export interface SkillIgnoreFlag extends MergeFlagBase {
  kind: 'ignore'
}

export interface ExperienceIgnoreFlag {
  kind: 'ignore'
  proposed_skill_name: string
  canonical_skill_name: string
  reason: string
}

export interface LinkedinImportMergeResult {
  skills_to_insert: PreparedUserSkill[]
  skills_to_merge: SkillMergeFlag[]
  skills_ignored: SkillIgnoreFlag[]
  experiences_to_insert: PreparedSkillExperience[]
  experiences_ignored: ExperienceIgnoreFlag[]
}

export interface SkillResolutionPlan {
  normalized_skill_names_needed: string[]
}

interface MergeParams {
  proposedSkills: LinkedinPreviewSkill[]
  proposedExperiences: LinkedinPreviewSkillExperience[]
  existingUserSkills: ExistingUserSkill[]
  existingExperiences: ExistingSkillExperience[]
  importDate?: string
}

const SKILL_SYNONYMS: Record<string, string> = {
  reactjs: 'react',
  reactjsx: 'react',
  reactts: 'react',
  nodejs: 'node',
  node: 'node',
  javascript: 'js',
  typescript: 'ts',
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
}

function canonicalizeSkillName(value: string): string {
  const cleaned = normalizeText(value).replace(/\s/g, '')
  return SKILL_SYNONYMS[cleaned] || cleaned
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const pairs = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i += 1) {
    const pair = a.slice(i, i + 2)
    pairs.set(pair, (pairs.get(pair) || 0) + 1)
  }

  let intersection = 0
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2)
    const count = pairs.get(pair) || 0
    if (count > 0) {
      pairs.set(pair, count - 1)
      intersection += 1
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1))
}

function findBestSkillMatch(
  proposedCanonicalSkill: string,
  existingSkills: ExistingUserSkill[]
): { existing: ExistingUserSkill; score: number } | null {
  let best: { existing: ExistingUserSkill; score: number } | null = null

  for (const existing of existingSkills) {
    const existingCanonical = canonicalizeSkillName(existing.skill_name)
    const score = diceCoefficient(proposedCanonicalSkill, existingCanonical)
    if (!best || score > best.score) {
      best = { existing, score }
    }
  }

  return best
}

function buildExperienceFingerprint(input: {
  skillCanonical: string
  jobTitle: string | null
  companyName?: string | null
  description: string
}): string {
  return [
    input.skillCanonical,
    normalizeText(input.jobTitle || ''),
    normalizeText(input.companyName || ''),
    normalizeText(input.description).slice(0, 120),
  ].join('|')
}

export function mergeLinkedinImportData(params: MergeParams): LinkedinImportMergeResult {
  const importDate = params.importDate || new Date().toISOString()
  const provenance: ImportProvenance = {
    source: 'linkedin',
    import_date: importDate,
  }

  const existingSkills = params.existingUserSkills || []
  const existingExperiences = params.existingExperiences || []

  const seenCanonicalSkills = new Set<string>()
  const skillsToInsert: PreparedUserSkill[] = []
  const skillsToMerge: SkillMergeFlag[] = []
  const skillsIgnored: SkillIgnoreFlag[] = []

  for (const proposedSkill of params.proposedSkills || []) {
    const canonical = canonicalizeSkillName(proposedSkill.skill_name)
    if (!canonical) continue

    if (seenCanonicalSkills.has(canonical)) {
      skillsIgnored.push({
        kind: 'ignore',
        proposed_skill_name: proposedSkill.skill_name,
        canonical_skill_name: canonical,
        reason: 'Duplicate skill within LinkedIn import payload',
      })
      continue
    }
    seenCanonicalSkills.add(canonical)

    const bestMatch = findBestSkillMatch(canonical, existingSkills)
    if (bestMatch && bestMatch.score >= 0.86) {
      skillsToMerge.push({
        kind: 'merge',
        proposed_skill_name: proposedSkill.skill_name,
        canonical_skill_name: canonical,
        reason:
          bestMatch.score === 1
            ? 'Exact skill already exists in user baseline'
            : 'Highly similar skill already exists in user baseline',
        matched_existing_skill_name: bestMatch.existing.skill_name,
        similarity_score: Math.round(bestMatch.score * 1000) / 1000,
        existing_user_skill_id: bestMatch.existing.id,
      })
      continue
    }

    skillsToInsert.push({
      skill_name: proposedSkill.skill_name.trim(),
      proficiency_level: proposedSkill.proficiency_level,
      years_of_experience: proposedSkill.years_of_experience,
      last_used_date: proposedSkill.last_used_date,
      notes: proposedSkill.notes,
      provenance,
    })
  }

  const existingExperienceFingerprints = new Set<string>(
    existingExperiences.map((existingExperience) =>
      buildExperienceFingerprint({
        skillCanonical: canonicalizeSkillName(existingExperience.skill_name),
        jobTitle: existingExperience.job_title,
        description: existingExperience.description || '',
      })
    )
  )

  const newExperienceFingerprints = new Set<string>()
  const experiencesToInsert: PreparedSkillExperience[] = []
  const experiencesIgnored: ExperienceIgnoreFlag[] = []

  for (const proposedExperience of params.proposedExperiences || []) {
    const canonical = canonicalizeSkillName(proposedExperience.skill_name)
    if (!canonical) continue

    const fingerprint = buildExperienceFingerprint({
      skillCanonical: canonical,
      jobTitle: proposedExperience.job_title,
      description: proposedExperience.description,
    })

    if (existingExperienceFingerprints.has(fingerprint)) {
      experiencesIgnored.push({
        kind: 'ignore',
        proposed_skill_name: proposedExperience.skill_name,
        canonical_skill_name: canonical,
        reason: 'Experience appears to already exist in user baseline',
      })
      continue
    }

    if (newExperienceFingerprints.has(fingerprint)) {
      experiencesIgnored.push({
        kind: 'ignore',
        proposed_skill_name: proposedExperience.skill_name,
        canonical_skill_name: canonical,
        reason: 'Duplicate experience within LinkedIn import payload',
      })
      continue
    }

    newExperienceFingerprints.add(fingerprint)
    experiencesToInsert.push({
      skill_name: proposedExperience.skill_name.trim(),
      job_title: proposedExperience.job_title,
      company_name: proposedExperience.company_name,
      description: proposedExperience.description.trim(),
      keywords: proposedExperience.keywords || [],
      provenance,
    })
  }

  return {
    skills_to_insert: skillsToInsert,
    skills_to_merge: skillsToMerge,
    skills_ignored: skillsIgnored,
    experiences_to_insert: experiencesToInsert,
    experiences_ignored: experiencesIgnored,
  }
}

export function buildSkillResolutionPlan(result: LinkedinImportMergeResult): SkillResolutionPlan {
  const names = new Set<string>()
  for (const row of result.skills_to_insert) {
    const canonical = canonicalizeSkillName(row.skill_name)
    if (canonical) names.add(canonical)
  }
  for (const row of result.experiences_to_insert) {
    const canonical = canonicalizeSkillName(row.skill_name)
    if (canonical) names.add(canonical)
  }

  return {
    normalized_skill_names_needed: Array.from(names).sort(),
  }
}
