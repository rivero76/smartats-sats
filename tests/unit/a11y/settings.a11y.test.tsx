/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: a11y test for Settings page (P19-S3-1)
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import Settings from '@/pages/Settings'
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

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { name: 'Test User', email: 'test@example.com' },
    loading: false,
    saving: false,
    getFormData: () => ({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '',
      location: '',
      professional_summary: '',
      linkedin_url: '',
      portfolio_url: '',
    }),
    saveProfile: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAccountDeletion', () => ({
  useAccountDeletion: () => ({
    deletionStatus: {
      isScheduledForDeletion: false,
      deletionDate: null,
      permanentDeletionDate: null,
      daysRemaining: null,
    },
    isLoading: false,
    isCancelling: false,
    cancelDeletion: vi.fn(),
    refreshStatus: vi.fn(),
  }),
}))

vi.mock('@/hooks/useResumePersonas', () => ({
  useResumePersonas: () => ({ data: [], isLoading: false }),
  useCreatePersona: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePersona: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePersona: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

it('Settings has no a11y violations', async () => {
  const { container } = render(<Settings />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
