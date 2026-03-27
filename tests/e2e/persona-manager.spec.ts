/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P16 S1 — Resume Persona CRUD functional E2E tests.
 *                        Covers: Settings section render, create dialog, validation,
 *                        full CRUD flow, and RLS isolation note (cross-tenant tested
 *                        by test-rls-cross-tenant script).
 *                        Closes UNTESTED_IMPLEMENTATIONS.md blocker #12.
 */
import { test, expect } from '@playwright/test'

const hasCredentials = !!(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD
)

test.describe('Persona Manager — Settings /settings', () => {
  test.skip(!hasCredentials, 'Skipped: PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  // ── 1. Section presence ───────────────────────────────────────────────────

  test('"My Resume Profiles" section is visible in Settings', async ({ page }) => {
    await expect(page.getByText('My Resume Profiles')).toBeVisible()
  })

  test('"Add Profile" button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add profile/i })).toBeVisible()
  })

  // ── 2. Create dialog ──────────────────────────────────────────────────────

  test('clicking "Add Profile" opens the create dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add profile/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /create resume profile/i })).toBeVisible()
  })

  test('dialog contains Profile Name and Target Role Family fields', async ({ page }) => {
    await page.getByRole('button', { name: /add profile/i }).click()
    await expect(page.getByLabel(/profile name/i)).toBeVisible()
    await expect(page.getByLabel(/target role family/i)).toBeVisible()
  })

  // ── 3. Validation ─────────────────────────────────────────────────────────

  test('submitting empty form shows validation errors', async ({ page }) => {
    await page.getByRole('button', { name: /add profile/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/profile name is required/i)).toBeVisible()
    await expect(page.getByText(/role family is required/i)).toBeVisible()
  })

  test('Cancel closes the dialog without saving', async ({ page }) => {
    await page.getByRole('button', { name: /add profile/i }).click()
    await page.getByLabel(/profile name/i).fill('Temp Persona')
    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Temp Persona')).not.toBeVisible()
  })

  // ── 4. Full CRUD flow ─────────────────────────────────────────────────────

  test('create → verify visible → edit name → delete persona', async ({ page }) => {
    const uniqueName = `E2E Persona ${Date.now()}`
    const editedName = `${uniqueName} — Edited`

    // CREATE
    await page.getByRole('button', { name: /add profile/i }).click()
    await page.getByLabel(/profile name/i).fill(uniqueName)
    await page.getByLabel(/target role family/i).fill('Software Engineering')
    await page.getByRole('dialog').getByRole('button', { name: /save/i }).click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // VERIFY VISIBLE
    await expect(page.getByText(uniqueName)).toBeVisible()

    // EDIT — find the edit button on this card
    const personaCard = page.locator('div').filter({ hasText: uniqueName }).first()
    await personaCard.getByRole('button', { name: /edit/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    const nameInput = page.getByLabel(/profile name/i)
    await nameInput.clear()
    await nameInput.fill(editedName)
    await page.getByRole('dialog').getByRole('button', { name: /save/i }).click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // VERIFY EDIT PERSISTED
    await expect(page.getByText(editedName)).toBeVisible()
    await expect(page.getByText(uniqueName)).not.toBeVisible()

    // DELETE
    const editedCard = page.locator('div').filter({ hasText: editedName }).first()
    await editedCard.getByRole('button', { name: /delete/i }).click()

    // Confirmation dialog
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByText(/delete resume profile/i)).toBeVisible()
    await page.getByRole('button', { name: /delete/i }).last().click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // VERIFY DELETED
    await expect(page.getByText(editedName)).not.toBeVisible()
  })
})
