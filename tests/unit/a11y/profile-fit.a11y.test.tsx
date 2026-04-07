/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S4 — Accessibility test for /profile-fit page.
 *   Renders the upsell gate (free tier default) and verifies no axe violations.
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import ProfileFit from '@/pages/ProfileFit'
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

vi.mock('@/hooks/usePlanFeature', () => ({
  usePlanFeature: () => ({
    plan: 'free',
    isLoading: false,
    hasFeature: () => false,
  }),
}))

vi.mock('@/hooks/useProfileFit', () => ({
  useProfileFitHistory: () => ({ data: [], isLoading: false }),
  useRunProfileFit: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
}))

vi.mock('@/hooks/useRoleFamilies', () => ({
  useRoleFamilies: () => ({ data: [] }),
}))

vi.mock('@/hooks/useCareerGoals', () => ({
  useCareerGoals: () => ({ data: null, isLoading: false }),
}))

vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({ data: [] }),
}))

it('ProfileFit (upsell gate) has no a11y violations', async () => {
  const { container } = render(<ProfileFit />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
