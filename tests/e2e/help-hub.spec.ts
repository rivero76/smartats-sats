/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | Help Hub functional E2E tests — validates /help page load, sidebar entry,
 *                        search/filter behaviour, empty state, and topic deep-link navigation.
 *                        Closes UNTESTED_IMPLEMENTATIONS.md item #17 (Help Hub page).
 */
import { test, expect } from '@playwright/test'

const hasCredentials = !!(process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD)

test.describe('Help Hub — /help', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
  })

  // ── 1. Page load ──────────────────────────────────────────────────────────

  test('renders the Help Hub heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Help Hub', level: 1 })).toBeVisible()
  })

  test('renders at least one topic card', async ({ page }) => {
    const cards = page.locator('[data-testid="help-topic-card"], .grid > div').filter({
      hasText: 'Open Related Page',
    })
    await expect(cards.first()).toBeVisible()
  })

  // ── 2. Sidebar entry ──────────────────────────────────────────────────────

  test('sidebar contains a Help Hub link that navigates to /help', async ({ page }) => {
    // Start from the dashboard to confirm sidebar is present
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const sidebarLink = page.getByRole('link', { name: /help hub/i })
    await expect(sidebarLink).toBeVisible()
    await sidebarLink.click()

    await expect(page).toHaveURL('/help')
    await expect(page.getByRole('heading', { name: 'Help Hub', level: 1 })).toBeVisible()
  })

  // ── 3. Search / filter ────────────────────────────────────────────────────

  test('search filters topic cards by keyword', async ({ page }) => {
    const input = page.getByPlaceholder(/search help topics/i)
    await expect(input).toBeVisible()

    // Count all cards before filtering
    const allCards = page.locator('button', { hasText: 'Open Related Page' })
    const totalBefore = await allCards.count()
    expect(totalBefore).toBeGreaterThan(1)

    // Type a term that should match exactly one or a subset of topics
    await input.fill('resume')
    await page.waitForTimeout(150) // debounce

    const filtered = page.locator('button', { hasText: 'Open Related Page' })
    const filteredCount = await filtered.count()

    // Filtering by "resume" must return fewer results than the full set
    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThan(totalBefore)
  })

  test('clearing the search restores all topic cards', async ({ page }) => {
    const input = page.getByPlaceholder(/search help topics/i)
    await input.fill('resume')
    await page.waitForTimeout(150)

    const afterFilter = await page.locator('button', { hasText: 'Open Related Page' }).count()

    await input.clear()
    await page.waitForTimeout(150)

    const afterClear = await page.locator('button', { hasText: 'Open Related Page' }).count()
    expect(afterClear).toBeGreaterThan(afterFilter)
  })

  // ── 4. Empty state ────────────────────────────────────────────────────────

  test('shows empty state when search matches nothing', async ({ page }) => {
    const input = page.getByPlaceholder(/search help topics/i)
    await input.fill('zzzyyyxxx_no_match')
    await page.waitForTimeout(150)

    // No result cards
    const cards = page.locator('button', { hasText: 'Open Related Page' })
    await expect(cards).toHaveCount(0)

    // Empty-state message visible
    await expect(page.getByText(/no help topics match/i)).toBeVisible()
  })

  // ── 5. Deep-link navigation ───────────────────────────────────────────────

  test('"Open Related Page" on Dashboard Overview navigates to /', async ({ page }) => {
    // Find the Dashboard Overview card and click its action button
    const dashboardCard = page.locator('div').filter({ hasText: 'Dashboard Overview' }).first()
    const button = dashboardCard.getByRole('button', { name: /open related page/i })
    await expect(button).toBeVisible()
    await button.click()

    await expect(page).toHaveURL('/')
  })

  test('"Open Related Page" on Resume Management navigates to /resumes', async ({ page }) => {
    const resumeCard = page.locator('div').filter({ hasText: 'Resume Management' }).first()
    const button = resumeCard.getByRole('button', { name: /open related page/i })
    await expect(button).toBeVisible()
    await button.click()

    await expect(page).toHaveURL('/resumes')
  })

  test('"Open Related Page" on ATS Analysis navigates to /analyses', async ({ page }) => {
    // Use search to surface the ATS topic easily
    const input = page.getByPlaceholder(/search help topics/i)
    await input.fill('ats')
    await page.waitForTimeout(150)

    const atsCard = page
      .locator('div')
      .filter({ hasText: /ats analysis/i })
      .first()
    const button = atsCard.getByRole('button', { name: /open related page/i })
    await expect(button).toBeVisible()
    await button.click()

    await expect(page).toHaveURL('/analyses')
  })

  // ── 6. Search input visibility ────────────────────────────────────────────

  test('search card renders with correct placeholder text', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/search help topics.*ats score.*missing skills/i)
    ).toBeVisible()
  })
})
