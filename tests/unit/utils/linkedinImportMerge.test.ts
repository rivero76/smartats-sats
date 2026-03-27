/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | Extended test suite: asymmetry fix regression, provenance on experiences,
 *                        empty baseline, within-payload dupes, synonym canonicalization,
 *                        below-threshold fuzzy, exact-match reason. Closes blocker #10.
 */
import { describe, expect, it } from 'vitest'
import {
  buildSkillResolutionPlan,
  canonicalizeSkillName,
  mergeLinkedinImportData,
} from '@/utils/linkedin-import-merge'

// ── Existing tests ──────────────────────────────────────────────────────────

describe('mergeLinkedinImportData', () => {
  it('flags highly similar skills for merge and preserves provenance on insert rows', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'React',
          proficiency_level: 'advanced',
          years_of_experience: 4,
          last_used_date: '2026-01-01',
          notes: null,
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
        {
          skill_name: 'TypeScript',
          proficiency_level: 'advanced',
          years_of_experience: 3,
          last_used_date: '2026-01-01',
          notes: null,
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
      ],
      proposedExperiences: [],
      existingUserSkills: [
        {
          id: 'existing-1',
          skill_id: 'skill-1',
          skill_name: 'React.js',
          proficiency_level: 'advanced',
          years_of_experience: 5,
        },
      ],
      existingExperiences: [],
      importDate: '2026-02-25T17:35:00.000Z',
    })

    expect(result.skills_to_merge).toHaveLength(1)
    expect(result.skills_to_merge[0].proposed_skill_name).toBe('React')

    expect(result.skills_to_insert).toHaveLength(1)
    expect(result.skills_to_insert[0].skill_name).toBe('TypeScript')
    expect(result.skills_to_insert[0].provenance.source).toBe('linkedin')
    expect(result.skills_to_insert[0].provenance.import_date).toBe('2026-02-25T17:35:00.000Z')
  })

  it('ignores duplicate experiences based on normalized fingerprint', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [],
      proposedExperiences: [
        {
          skill_name: 'React',
          job_title: 'Senior Engineer',
          company_name: 'Northstar',
          description: 'Built UI workflows and improved conversion rates.',
          keywords: ['react', 'ux'],
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
      ],
      existingUserSkills: [],
      existingExperiences: [
        {
          id: 'exp-1',
          skill_id: 'skill-1',
          skill_name: 'React.js',
          job_title: 'Senior Engineer',
          description: 'Built UI workflows and improved conversion rates.',
          keywords: ['react', 'frontend'],
        },
      ],
      importDate: '2026-02-25T17:35:00.000Z',
    })

    expect(result.experiences_to_insert).toHaveLength(0)
    expect(result.experiences_ignored).toHaveLength(1)
  })

  it('builds normalized skill resolution plan from insert-ready rows', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'Node.js',
          proficiency_level: null,
          years_of_experience: null,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
      ],
      proposedExperiences: [
        {
          skill_name: 'React.js',
          job_title: 'Engineer',
          company_name: 'Acme',
          description: 'Built interface.',
          keywords: [],
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
      ],
      existingUserSkills: [],
      existingExperiences: [],
      importDate: '2026-02-25T17:35:00.000Z',
    })

    const plan = buildSkillResolutionPlan(result)
    expect(plan.normalized_skill_names_needed).toEqual(['node', 'react'])
  })

  // ── New tests ────────────────────────────────────────────────────────────

  it('asymmetry fix regression — company_name in proposed does not block match against existing that has no company_name', () => {
    // sats_skill_experiences has no company_name column, so existing fingerprints
    // are built WITHOUT company_name. Proposed fingerprints must also omit it
    // (fix from 2026-03-01). Both sides must hash identically for the dedupe to work.
    const result = mergeLinkedinImportData({
      proposedSkills: [],
      proposedExperiences: [
        {
          skill_name: 'Python',
          job_title: 'Data Engineer',
          company_name: 'BigCorp',   // present in proposed
          description: 'Built ETL pipelines and data quality checks.',
          keywords: ['python', 'etl'],
          source: 'linkedin',
          import_date: '2026-02-25T17:35:00.000Z',
        },
      ],
      existingUserSkills: [],
      existingExperiences: [
        {
          id: 'exp-2',
          skill_id: 'skill-python',
          skill_name: 'Python',
          job_title: 'Data Engineer',
          description: 'Built ETL pipelines and data quality checks.',
          keywords: null,             // existing has no company_name column at all
        },
      ],
      importDate: '2026-02-25T17:35:00.000Z',
    })

    // If asymmetry were reintroduced the fingerprints would differ and the
    // experience would land in experiences_to_insert — the fix must produce 0 inserts.
    expect(result.experiences_to_insert).toHaveLength(0)
    expect(result.experiences_ignored).toHaveLength(1)
    expect(result.experiences_ignored[0].reason).toMatch(/already exist/i)
  })

  it('provenance is tagged on all insert-ready experience rows', () => {
    const importDate = '2026-03-27T10:00:00.000Z'
    const result = mergeLinkedinImportData({
      proposedSkills: [],
      proposedExperiences: [
        {
          skill_name: 'Go',
          job_title: 'Backend Engineer',
          company_name: 'Startup',
          description: 'Designed microservices with Go and gRPC.',
          keywords: ['go', 'grpc'],
          source: 'linkedin',
          import_date: importDate,
        },
      ],
      existingUserSkills: [],
      existingExperiences: [],
      importDate,
    })

    expect(result.experiences_to_insert).toHaveLength(1)
    const exp = result.experiences_to_insert[0]
    expect(exp.provenance.source).toBe('linkedin')
    expect(exp.provenance.import_date).toBe(importDate)
  })

  it('empty baseline — all proposed skills and experiences go to insert', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'Rust',
          proficiency_level: 'beginner',
          years_of_experience: 1,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
      ],
      proposedExperiences: [
        {
          skill_name: 'Rust',
          job_title: 'Systems Engineer',
          company_name: null,
          description: 'Wrote low-level memory-safe systems code.',
          keywords: ['rust', 'systems'],
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
      ],
      existingUserSkills: [],
      existingExperiences: [],
    })

    expect(result.skills_to_insert).toHaveLength(1)
    expect(result.skills_to_merge).toHaveLength(0)
    expect(result.skills_ignored).toHaveLength(0)
    expect(result.experiences_to_insert).toHaveLength(1)
    expect(result.experiences_ignored).toHaveLength(0)
  })

  it('within-payload duplicate skills — second occurrence is ignored', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'Vue',
          proficiency_level: 'intermediate',
          years_of_experience: 2,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
        {
          skill_name: 'Vue',  // exact duplicate
          proficiency_level: 'beginner',
          years_of_experience: 1,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
      ],
      proposedExperiences: [],
      existingUserSkills: [],
      existingExperiences: [],
    })

    expect(result.skills_to_insert).toHaveLength(1)
    expect(result.skills_ignored).toHaveLength(1)
    expect(result.skills_ignored[0].reason).toMatch(/duplicate/i)
  })

  it('within-payload duplicate experiences — second occurrence is ignored', () => {
    const sharedExp = {
      skill_name: 'Docker',
      job_title: 'DevOps Engineer',
      company_name: 'Cloud Co',
      description: 'Containerized microservices and managed CI pipelines.',
      keywords: ['docker', 'ci'],
      source: 'linkedin' as const,
      import_date: '2026-03-27T10:00:00.000Z',
    }
    const result = mergeLinkedinImportData({
      proposedSkills: [],
      proposedExperiences: [sharedExp, { ...sharedExp }],
      existingUserSkills: [],
      existingExperiences: [],
    })

    expect(result.experiences_to_insert).toHaveLength(1)
    expect(result.experiences_ignored).toHaveLength(1)
    expect(result.experiences_ignored[0].reason).toMatch(/duplicate/i)
  })

  it('synonym canonicalization — ReactJS and Node.js normalize to known canonical forms', () => {
    expect(canonicalizeSkillName('ReactJS')).toBe('react')
    expect(canonicalizeSkillName('Node.js')).toBe('node')
    expect(canonicalizeSkillName('JavaScript')).toBe('js')
    expect(canonicalizeSkillName('TypeScript')).toBe('ts')
  })

  it('below-threshold fuzzy match — distinct skills both go to insert', () => {
    // 'Python' vs 'Ruby' have low Dice similarity — both should insert
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'Python',
          proficiency_level: 'advanced',
          years_of_experience: 5,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
      ],
      proposedExperiences: [],
      existingUserSkills: [
        {
          id: 'existing-ruby',
          skill_id: 'skill-ruby',
          skill_name: 'Ruby',
          proficiency_level: 'intermediate',
          years_of_experience: 2,
        },
      ],
      existingExperiences: [],
    })

    expect(result.skills_to_insert).toHaveLength(1)
    expect(result.skills_to_merge).toHaveLength(0)
  })

  it('exact match — reason text indicates exact duplicate, not fuzzy', () => {
    const result = mergeLinkedinImportData({
      proposedSkills: [
        {
          skill_name: 'PostgreSQL',
          proficiency_level: 'advanced',
          years_of_experience: 4,
          last_used_date: null,
          notes: null,
          source: 'linkedin',
          import_date: '2026-03-27T10:00:00.000Z',
        },
      ],
      proposedExperiences: [],
      existingUserSkills: [
        {
          id: 'existing-pg',
          skill_id: 'skill-pg',
          skill_name: 'PostgreSQL', // exact same canonical
          proficiency_level: 'advanced',
          years_of_experience: 4,
        },
      ],
      existingExperiences: [],
    })

    expect(result.skills_to_merge).toHaveLength(1)
    expect(result.skills_to_merge[0].similarity_score).toBe(1)
    expect(result.skills_to_merge[0].reason).toMatch(/exact/i)
  })
})
