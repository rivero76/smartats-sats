/**
 * UPDATE LOG
 * 2026-03-26 | S3-1: shared providers wrapper for a11y tests — QueryClient + MemoryRouter
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/**
 * Wraps a component under test with the minimum providers needed to render
 * any SmartATS page: React Query (no retries, instant fail) + MemoryRouter.
 * Auth context is mocked per-file via vi.mock('@/contexts/AuthContext').
 */
export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}
