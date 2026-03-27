/**
 * UPDATE LOG
 * 2026-03-26 | P19 S3-2: visual screenshot baselines for 5 main pages (P19-S3-2)
 */
import { test, expect } from '@playwright/test'

/**
 * Visual regression baselines for the 5 primary pages.
 *
 * First run (generating baselines):
 *   npx playwright test tests/e2e/visual/pages.spec.ts --update-snapshots
 *
 * Subsequent runs compare against committed baselines.
 * Max pixel diff tolerance: 2% (handles font hinting / OS rendering deltas).
 *
 * Prerequisites:
 *   - App built:   npm run build
 *   - Credentials: PLAYWRIGHT_TEST_EMAIL + PLAYWRIGHT_TEST_PASSWORD set
 *   - Auth state:  tests/e2e/.auth/user.json written by auth.setup.ts
 */

const hasCredentials = !!(process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD)

/** Wait for the page content to settle before snapping (data loads, animations). */
async function waitForPageReady(page: import('@playwright/test').Page) {
  // Wait for the network to be idle and any skeleton loaders to resolve
  await page.waitForLoadState('networkidle')
  // Small buffer for framer-motion exit/enter transitions to finish
  await page.waitForTimeout(400)
}

test.describe('Visual baselines — main pages', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test('Dashboard', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 })
  })

  test('Resumes', async ({ page }) => {
    await page.goto('/resumes')
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('resumes.png', { maxDiffPixelRatio: 0.02 })
  })

  test('ATS Analyses', async ({ page }) => {
    await page.goto('/analyses')
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('ats-analyses.png', { maxDiffPixelRatio: 0.02 })
  })

  test('Enriched Experiences', async ({ page }) => {
    await page.goto('/experiences')
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('experiences.png', { maxDiffPixelRatio: 0.02 })
  })

  test('Settings', async ({ page }) => {
    await page.goto('/settings')
    await waitForPageReady(page)
    await expect(page).toHaveScreenshot('settings.png', { maxDiffPixelRatio: 0.02 })
  })
})
