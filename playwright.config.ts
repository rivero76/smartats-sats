/**
 * UPDATE LOG
 * 2026-03-26 | P19 S3-2: Playwright visual regression config — setup + visual projects (P19-S3-2)
 * 2026-03-27 | Added functional project for Help Hub E2E tests (help-hub.spec.ts)
 * 2026-03-27 | Expanded functional project to cover all e2e/*.spec.ts files (opportunities,
 *              ats-analyses, roadmaps, persona-manager, log-viewer)
 */
import { defineConfig, devices } from '@playwright/test'

/**
 * Base URL for the app under test.
 * Override with PLAYWRIGHT_BASE_URL in CI or locally when using a different port.
 * Default: http://localhost:4173 (vite preview default port)
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
  },

  projects: [
    /**
     * Auth setup — runs first, writes storageState to tests/e2e/.auth/user.json.
     * Skipped automatically if PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD are absent.
     */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * Visual regression — depends on setup having written the auth state.
     * Each test skips itself when credentials are unavailable.
     */
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /pages\.spec\.ts/,
    },

    /**
     * Functional E2E — behaviour and navigation tests (no screenshot comparison).
     * Uses the same auth state as the visual project.
     */
    {
      name: 'functional',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      // Matches all *.spec.ts directly under tests/e2e/ (excludes the visual/ subdirectory)
      testMatch: /e2e\/[^/]+\.spec\.ts/,
    },
  ],

  /**
   * Start vite preview automatically when running tests locally or in CI.
   * Requires a prior `npm run build`. Use reuseExistingServer so a dev server
   * running on the same port is reused without conflict.
   */
  webServer: {
    command: 'npx vite preview --port 4173',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
