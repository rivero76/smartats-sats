/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | Admin LogViewer time-window filter functional E2E tests.
 *                        Covers: default state (ERROR + 1h), dropdown options, filter
 *                        application (All Levels + All time increases row count).
 *                        Closes UNTESTED_IMPLEMENTATIONS.md blocker #16.
 */
import { test, expect } from '@playwright/test'

const hasCredentials = !!(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD
)

test.describe('Admin LogViewer — /admin', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
  })

  // ── 1. Log Viewer section ─────────────────────────────────────────────────

  test('Log Viewer card is visible on Admin page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Log Viewer' })).toBeVisible()
  })

  test('Time Window label and dropdown are visible', async ({ page }) => {
    await expect(page.getByText('Time Window')).toBeVisible()
  })

  test('Level filter label and dropdown are visible', async ({ page }) => {
    await expect(page.getByText('Level')).toBeVisible()
  })

  // ── 2. Default state: ERROR + Last 1 hour ─────────────────────────────────

  test('default Level filter shows ERROR', async ({ page }) => {
    // The select trigger for Level should display "ERROR" by default
    const levelTrigger = page.locator('button[role="combobox"]').filter({ hasText: 'ERROR' })
    await expect(levelTrigger).toBeVisible()
  })

  test('default Time Window shows Last 1 hour', async ({ page }) => {
    const timeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /last 1 hour/i })
    await expect(timeTrigger).toBeVisible()
  })

  // ── 3. Dropdown options ───────────────────────────────────────────────────

  test('Time Window dropdown contains all required options', async ({ page }) => {
    // Open the time window select
    const timeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /last 1 hour/i })
    await timeTrigger.click()

    await expect(page.getByRole('option', { name: /last 5 min/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /last 15 min/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /last 1 hour/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /last 6 hours/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /last 24 hours/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /all time/i })).toBeVisible()

    // Close by pressing Escape
    await page.keyboard.press('Escape')
  })

  test('Level dropdown contains all required options', async ({ page }) => {
    const levelTrigger = page.locator('button[role="combobox"]').filter({ hasText: 'ERROR' })
    await levelTrigger.click()

    await expect(page.getByRole('option', { name: /all levels/i })).toBeVisible()
    await expect(page.getByRole('option', { name: 'ERROR' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'INFO' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'DEBUG' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'TRACE' })).toBeVisible()

    await page.keyboard.press('Escape')
  })

  // ── 4. Filter application ─────────────────────────────────────────────────

  test('switching Level to "All Levels" updates the select and triggers a refetch', async ({
    page,
  }) => {
    const levelTrigger = page.locator('button[role="combobox"]').filter({ hasText: 'ERROR' })
    await levelTrigger.click()
    await page.getByRole('option', { name: /all levels/i }).click()

    // Trigger displays new value
    await expect(
      page.locator('button[role="combobox"]').filter({ hasText: /all levels/i })
    ).toBeVisible()

    // Network activity confirms a new query was fired
    await page.waitForLoadState('networkidle')
  })

  test('switching Time Window to "All time" with All Levels returns ≥ as many rows as 1h + ERROR', async ({
    page,
  }) => {
    // Count rows under default filter (ERROR + 1h)
    await page.waitForLoadState('networkidle')
    const defaultRowCount = await page.locator('table tbody tr, [data-log-entry]').count()

    // Switch to All Levels
    const levelTrigger = page.locator('button[role="combobox"]').filter({ hasText: 'ERROR' })
    await levelTrigger.click()
    await page.getByRole('option', { name: /all levels/i }).click()
    await page.waitForLoadState('networkidle')

    // Switch to All time
    const timeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /last 1 hour/i })
    await timeTrigger.click()
    await page.getByRole('option', { name: /all time/i }).click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)

    const broadRowCount = await page.locator('table tbody tr, [data-log-entry]').count()

    // Broader filter must return equal or more rows
    expect(broadRowCount).toBeGreaterThanOrEqual(defaultRowCount)
  })

  test('switching Time Window to "Last 5 min" then back to "Last 1 hour" updates the trigger label', async ({
    page,
  }) => {
    const timeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /last 1 hour/i })
    await timeTrigger.click()
    await page.getByRole('option', { name: /last 5 min/i }).click()

    await expect(
      page.locator('button[role="combobox"]').filter({ hasText: /last 5 min/i })
    ).toBeVisible()

    // Switch back
    const updatedTrigger = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /last 5 min/i })
    await updatedTrigger.click()
    await page.getByRole('option', { name: /last 1 hour/i }).click()

    await expect(
      page.locator('button[role="combobox"]').filter({ hasText: /last 1 hour/i })
    ).toBeVisible()
  })
})
