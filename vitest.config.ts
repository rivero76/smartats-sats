/**
 * UPDATE LOG
 * 2026-03-18 | Add placeholder Supabase env vars so unit tests don't throw at
 *              module-init time in CI — supabase/client.ts calls getRequiredEnv()
 *              at import which throws if VITE_SUPABASE_* vars are absent.
 * 2026-03-26 | S3-1: extend include pattern to cover .test.tsx files for a11y tests (P19-S3-1)
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/unit/a11y/setup-dom.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    env: {
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder_anon_key_for_unit_tests',
    },
  },
})
