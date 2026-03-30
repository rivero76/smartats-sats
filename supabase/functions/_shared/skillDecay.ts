/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S5 — Shared skill decay utility.
 *   Extracted from ats-analysis-direct S4 implementation to allow reuse
 *   in async-ats-scorer. Provides buildWeightedSkillText() for converting
 *   a user's sats_skill_profiles + decay config into a plain-text prompt block.
 *
 *   Weight formula (never stored — computed at call time):
 *     effective_year = user_confirmed_last_used_year ?? ai_last_used_year
 *     weight = max(floor_weight, 1.0 - (decay_rate_pct/100) * max(0, (currentYear - effective_year - grace_years)))
 *
 *   Transferable skills (transferable_to[]) are always injected at weight 1.0.
 */

export interface SkillProfileRow {
  skill_name: string
  category: string
  depth: string
  ai_last_used_year: number | null
  user_confirmed_last_used_year: number | null
  transferable_to: string[]
  career_chapter: string | null
  user_context: string | null
}

export interface DecayConfigRow {
  category: string
  decay_rate_pct: number
  grace_years: number
  floor_weight: number
}

type DecayMap = Record<
  string,
  { decay_rate_pct: number; grace_years: number; floor_weight: number }
>

function buildDecayMap(configs: DecayConfigRow[]): DecayMap {
  const map: DecayMap = {}
  for (const row of configs) {
    map[row.category] = {
      decay_rate_pct: row.decay_rate_pct,
      grace_years: row.grace_years,
      floor_weight: row.floor_weight,
    }
  }
  return map
}

function computeWeight(skill: SkillProfileRow, decayMap: DecayMap, currentYear: number): number {
  const config = decayMap[skill.category] ?? {
    decay_rate_pct: 0,
    grace_years: 0,
    floor_weight: 1.0,
  }
  const effectiveYear =
    skill.user_confirmed_last_used_year ?? skill.ai_last_used_year ?? currentYear
  const yearsDecayed = Math.max(0, currentYear - effectiveYear - config.grace_years)
  const rawWeight = 1.0 - (config.decay_rate_pct / 100) * yearsDecayed
  return Math.max(config.floor_weight, Math.min(1.0, rawWeight))
}

/**
 * Converts a user's classified skill profiles into a prompt-ready text block.
 * Returns empty string if skills array is empty.
 *
 * @param skills  - Rows from sats_skill_profiles for a single user
 * @param configs - All rows from sats_skill_decay_config (fetched once, shared across users)
 */
export function buildWeightedSkillText(
  skills: SkillProfileRow[],
  configs: DecayConfigRow[]
): string {
  if (skills.length === 0) return ''

  const decayMap = buildDecayMap(configs)
  const currentYear = new Date().getFullYear()
  const lines: string[] = []
  const transferableAccum = new Set<string>()

  for (const skill of skills) {
    const weight = computeWeight(skill, decayMap, currentYear)
    lines.push(
      `- ${skill.skill_name} [${skill.category}/${skill.depth}, weight=${weight.toFixed(2)}${skill.career_chapter ? `, chapter=${skill.career_chapter}` : ''}${skill.user_context ? `, note: ${skill.user_context}` : ''}]`
    )
    for (const t of skill.transferable_to ?? []) {
      transferableAccum.add(t)
    }
  }

  const transferableLines = [...transferableAccum].map((t) => `- ${t} [transferable, weight=1.00]`)

  return [
    'Candidate skill profile (AI-classified; use as additive context — do not override resume evidence):',
    ...lines,
    ...(transferableLines.length > 0 ? ['Transferable capabilities:', ...transferableLines] : []),
  ].join('\n')
}
