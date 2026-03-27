/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P14 S4 — /opportunities dashboard functional E2E tests.
 *                        Closes UNTESTED_IMPLEMENTATIONS.md blocker #4.
 */
import { test, expect } from '@playwright/test'

const hasCredentials = !!(process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD)

test.describe('Opportunities — /opportunities', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')
  })

  // ── 1. Page structure ─────────────────────────────────────────────────────

  test('renders Opportunities heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Opportunities', level: 1 })).toBeVisible()
  })

  test('Beta badge is visible', async ({ page }) => {
    await expect(page.getByText('Beta')).toBeVisible()
  })

  test('subtitle describes proactive opportunities ordered by score', async ({ page }) => {
    await expect(
      page.getByText(/high-match proactive opportunities.*ordered by ats score/i)
    ).toBeVisible()
  })

  // ── 2. Empty state (most likely for a test account) ───────────────────────

  test('empty state or match cards render — no crash', async ({ page }) => {
    // Either the empty state card or at least one opportunity card must be visible.
    // The page must not show an error state (no "Unable to load" heading).
    const errorHeading = page.getByRole('heading', { name: /unable to load/i })
    await expect(errorHeading).not.toBeVisible()

    const emptyState = page.getByText(/no high-match opportunities yet/i)
    const cards = page.locator('.grid > div').filter({ hasText: /ats score/i })

    // One of the two must be visible
    const emptyVisible = await emptyState.isVisible()
    const cardsVisible = (await cards.count()) > 0
    expect(emptyVisible || cardsVisible).toBe(true)
  })

  test('empty state explains the 60% score threshold', async ({ page }) => {
    const emptyState = page.getByText(/no high-match opportunities yet/i)
    if (await emptyState.isVisible()) {
      await expect(page.getByText(/60%/i)).toBeVisible()
    }
  })

  // ── 3. Opportunity cards (when data is present) ───────────────────────────

  test('if match cards are present they show an ATS score', async ({ page }) => {
    const cards = page.locator('.grid > div').filter({ hasText: /ats score/i })
    if ((await cards.count()) === 0) return // no data — skip assertions

    const firstCard = cards.first()
    // Score badge should contain a percentage value
    await expect(firstCard.getByText(/%/)).toBeVisible()
  })

  test('if match cards are present they are ordered highest score first', async ({ page }) => {
    const scoreTexts = await page.locator('[data-score], .font-bold').allInnerTexts()
    const scores = scoreTexts
      .map((t) => parseInt(t.replace('%', '')))
      .filter((n) => !isNaN(n) && n >= 60)

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })

  // ── 4. Sidebar navigation ─────────────────────────────────────────────────

  test('sidebar Opportunities link navigates to /opportunities', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const link = page.getByRole('link', { name: /opportunities/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/opportunities')
  })
})
