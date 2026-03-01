import { describe, expect, it } from 'vitest'
import { buildSkillResolutionPlan, mergeLinkedinImportData } from '@/utils/linkedinImportMerge'

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
})
