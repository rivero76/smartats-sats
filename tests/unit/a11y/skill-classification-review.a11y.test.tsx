/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S3 — a11y test for SkillClassificationReview component
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import {
  SkillClassificationReview,
  type ClassifiedSkill,
  type CareerChapter,
} from '@/components/skill-profile/SkillClassificationReview'
import { createWrapper } from './setup'

expect.extend(toHaveNoViolations)

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: {},
    satsUser: {
      id: '1',
      auth_user_id: 'test-user-id',
      name: 'Test User',
      role: 'user',
      created_at: '',
      updated_at: '',
    },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSkillProfile', () => ({
  useSaveSkillProfiles: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

const MOCK_SKILLS: ClassifiedSkill[] = [
  {
    skill_name: 'Oracle Database Administration',
    category: 'technical',
    depth: 'expert',
    last_used_year: 2010,
    transferable_to: ['SLA management', 'incident response', 'ITIL operations'],
    career_chapter: 'Technical Foundation',
  },
  {
    skill_name: 'Project Management',
    category: 'methodology',
    depth: 'expert',
    last_used_year: 2026,
    transferable_to: [],
    career_chapter: 'Leadership & Strategy',
  },
]

const MOCK_CHAPTERS: CareerChapter[] = [
  { label: 'Technical Foundation', start_year: 2000, end_year: 2012 },
  { label: 'Leadership & Strategy', start_year: 2020, end_year: null },
]

it('SkillClassificationReview has no a11y violations', async () => {
  const { container } = render(
    <SkillClassificationReview
      classifiedSkills={MOCK_SKILLS}
      careerChapters={MOCK_CHAPTERS}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      canReclassify={false}
    />,
    { wrapper: createWrapper() }
  )
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

it('SkillClassificationReview with canReclassify=true has no a11y violations', async () => {
  const { container } = render(
    <SkillClassificationReview
      classifiedSkills={MOCK_SKILLS}
      careerChapters={MOCK_CHAPTERS}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      canReclassify={true}
      onReclassify={vi.fn()}
    />,
    { wrapper: createWrapper() }
  )
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
