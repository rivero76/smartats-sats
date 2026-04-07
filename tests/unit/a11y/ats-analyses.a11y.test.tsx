/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: a11y test for ATSAnalyses page (P19-S3-1)
 */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { expect, it, vi } from 'vitest'
import ATSAnalyses from '@/pages/ATSAnalyses'
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

vi.mock('@/hooks/useATSAnalyses', () => ({
  useATSAnalyses: () => ({ data: [], isLoading: false, error: null }),
  useATSAnalysisStats: () => ({
    data: { totalAnalyses: 0, averageScore: 0, highMatches: 0, needImprovement: 0 },
    isLoading: false,
  }),
  useCreateATSAnalysis: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteATSAnalysis: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useJobDescriptions', () => ({
  useJobDescriptions: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useRetryATSAnalysis', () => ({
  useRetryATSAnalysis: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/components/ATSAnalysisProgress', () => ({
  default: () => null,
}))

vi.mock('@/components/ATSDebugModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ATSAnalysisModal', () => ({
  default: () => null,
}))

vi.mock('@/components/EnrichExperienceModal', () => ({
  EnrichExperienceModal: () => null,
}))

it('ATSAnalyses has no a11y violations', async () => {
  const { container } = render(<ATSAnalyses />, { wrapper: createWrapper() })
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
