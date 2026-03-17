/**
 * UPDATE LOG
 * 2026-03-18 | Add placeholder Supabase env vars so unit tests don't throw at
 *              module-init time in CI — supabase/client.ts calls getRequiredEnv()
 *              at import which throws if VITE_SUPABASE_* vars are absent.
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder_anon_key_for_unit_tests',
    },
  },
})
