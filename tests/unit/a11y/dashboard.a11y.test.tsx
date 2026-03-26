/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: a11y test for Dashboard page (P19-S3-1)
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import Dashboard from '@/pages/Dashboard'
import { createWrapper } from './setup'

expect.extend(toHaveNoViolations)

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: {},
    satsUser: { id: '1', auth_user_id: 'test-user-id', name: 'Test User', role: 'user', created_at: '', updated_at: '' },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation: vi.fn(),
  }),
}))

vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/hooks/useJobDescriptions', () => ({
  useJobDescriptions: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/hooks/useATSAnalyses', () => ({
  useATSAnalyses: () => ({ data: [], isLoading: false, error: null }),
  useATSAnalysisStats: () => ({ data: { totalAnalyses: 0, avgScore: 0 }, isLoading: false }),
}))

it('Dashboard has no a11y violations', async () => {
  const { container } = render(<Dashboard />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
