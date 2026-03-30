/**
 * UPDATE LOG
 * 2026-03-30 10:00:00 | P25 S6 — a11y test for SkillProfileManager component
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import { SkillProfileManager } from '@/components/skill-profile/SkillProfileManager'
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
  useSkillProfile: () => ({
    data: [
      {
        id: 'sp-1',
        user_id: 'test-user-id',
        skill_name: 'Oracle Database Administration',
        category: 'technical',
        depth: 'expert',
        ai_last_used_year: 2010,
        user_confirmed_last_used_year: null,
        transferable_to: ['SLA management'],
        career_chapter: 'Technical Foundation',
        user_context: null,
        source_experience_ids: [],
        ai_classification_version: '1.0.0',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'sp-2',
        user_id: 'test-user-id',
        skill_name: 'Project Management',
        category: 'methodology',
        depth: 'expert',
        ai_last_used_year: 2026,
        user_confirmed_last_used_year: 2026,
        transferable_to: [],
        career_chapter: 'Leadership & Strategy',
        user_context: null,
        source_experience_ids: [],
        ai_classification_version: '1.0.0',
        created_at: '',
        updated_at: '',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useDeleteSkillProfile: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

it('SkillProfileManager has no a11y violations with skills loaded', async () => {
  const { container } = render(<SkillProfileManager />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

it('SkillProfileManager empty state has no a11y violations', async () => {
  vi.mocked(await import('@/hooks/useSkillProfile')).useSkillProfile = () => ({
    data: [],
    isLoading: false,
    error: null,
  })
  const { container } = render(<SkillProfileManager />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
