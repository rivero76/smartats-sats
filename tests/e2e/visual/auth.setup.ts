/**
 * UPDATE LOG
 * 2026-03-26 | P19 S3-2: global auth setup for visual regression tests (P19-S3-2)
 * 2026-03-27 | Fix: replace __dirname with import.meta.url (ESM compat — package.json "type":"module")
 */
import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AUTH_FILE = path.join(__dirname, '../.auth/user.json')

/**
 * Authenticate once and persist the Supabase session cookies to .auth/user.json.
 * All visual tests load this state file so every page is already logged in.
 *
 * Required env vars:
 *   PLAYWRIGHT_TEST_EMAIL    — test account email
 *   PLAYWRIGHT_TEST_PASSWORD — test account password
 *
 * If either variable is missing the setup is skipped and an empty state file
 * is written so dependent tests can still load (they skip themselves too).
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD

  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  if (!email || !password) {
    // Write an empty state so the visual project's storageState path resolves
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    setup.skip(true, 'PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set — skipping auth setup')
    return
  }

  await page.goto('/auth')

  // The Sign In tab is the default; fill credentials by element id
  await page.locator('#signin-email').fill(email)
  await page.locator('#signin-password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for redirect to the dashboard after successful login
  await page.waitForURL('/', { timeout: 15_000 })
  await expect(page).toHaveURL('/')

  await page.context().storageState({ path: AUTH_FILE })
})
