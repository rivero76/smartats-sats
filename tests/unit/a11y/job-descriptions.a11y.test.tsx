/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: a11y test for JobDescriptions page (P19-S3-1)
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import JobDescriptions from '@/pages/JobDescriptions'
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

vi.mock('@/hooks/useJobDescriptions', () => ({
  useJobDescriptions: () => ({ data: [], isLoading: false, error: null }),
  useCompanies: () => ({ data: [], isLoading: false }),
  useLocations: () => ({ data: [], isLoading: false }),
  useCreateJobDescription: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateJobDescription: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteJobDescription: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateLocation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIngestJobDescriptionUrl: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

it('JobDescriptions has no a11y violations', async () => {
  const { container } = render(<JobDescriptions />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
