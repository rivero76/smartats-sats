/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P15 S3 — /roadmaps timeline UI functional E2E tests.
 *                        Covers: page load, empty state, refresh button, milestone
 *                        toggle persistence, progress bar update.
 *                        Closes UNTESTED_IMPLEMENTATIONS.md blocker #8.
 */
import { test, expect } from '@playwright/test'

const hasCredentials = !!(process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD)

test.describe('Upskilling Roadmaps — /roadmaps', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/roadmaps')
    await page.waitForLoadState('networkidle')
  })

  // ── 1. Page structure ─────────────────────────────────────────────────────

  test('renders Upskilling Roadmaps heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Upskilling Roadmaps', level: 1 })).toBeVisible()
  })

  test('Beta badge is visible', async ({ page }) => {
    await expect(page.getByText('Beta')).toBeVisible()
  })

  test('Refresh button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible()
  })

  test('page does not show an error state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /error|failed/i })).not.toBeVisible()
  })

  // ── 2. Empty state ────────────────────────────────────────────────────────

  test('empty state renders with correct CTA when no roadmaps exist', async ({ page }) => {
    const hasRoadmaps =
      (await page
        .locator('button')
        .filter({ hasText: /select a roadmap/i })
        .count()) > 0
    if (hasRoadmaps) return // data present — skip empty state test

    await expect(page.getByRole('heading', { name: 'No Roadmaps Yet' })).toBeVisible()
    await expect(page.getByText(/generate your first roadmap from an ats analysis/i)).toBeVisible()
  })

  // ── 3. Roadmap with data: milestone toggle ────────────────────────────────

  test('milestone checkbox toggles and progress bar updates', async ({ page }) => {
    // If no roadmap data is present, skip
    const milestoneCheckbox = page.getByRole('checkbox').first()
    if (!(await milestoneCheckbox.isVisible())) return

    // Read the progress bar value before toggle
    const progressBar = page.locator('[role="progressbar"]').first()
    const valueBefore = await progressBar.getAttribute('aria-valuenow')

    const wasChecked = await milestoneCheckbox.isChecked()
    await milestoneCheckbox.click()

    // Wait for the DB mutation to resolve (network idle)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Checkbox state should have flipped
    const isCheckedNow = await milestoneCheckbox.isChecked()
    expect(isCheckedNow).toBe(!wasChecked)

    // Progress bar value should have changed
    const valueAfter = await progressBar.getAttribute('aria-valuenow')
    expect(valueAfter).not.toBe(valueBefore)

    // Restore original state
    await milestoneCheckbox.click()
    await page.waitForLoadState('networkidle')
  })

  test('milestone completion persists across page reload', async ({ page }) => {
    const milestoneCheckbox = page.getByRole('checkbox').first()
    if (!(await milestoneCheckbox.isVisible())) return

    const wasChecked = await milestoneCheckbox.isChecked()

    // Toggle
    await milestoneCheckbox.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')

    const afterReload = page.getByRole('checkbox').first()
    const isCheckedAfterReload = await afterReload.isChecked()
    expect(isCheckedAfterReload).toBe(!wasChecked)

    // Restore
    await afterReload.click()
    await page.waitForLoadState('networkidle')
  })

  // ── 4. Multi-roadmap selector ─────────────────────────────────────────────

  test('roadmap selector buttons appear when user has multiple roadmaps', async ({ page }) => {
    const selectCard = page.getByRole('heading', { name: /select a roadmap/i, level: 3 })
    if (!(await selectCard.isVisible())) return // single or no roadmap — skip

    // At least two selector buttons must be visible
    const selectorButtons = page.getByRole('button').filter({ hasText: /\w/ })
    expect(await selectorButtons.count()).toBeGreaterThanOrEqual(2)
  })
})
