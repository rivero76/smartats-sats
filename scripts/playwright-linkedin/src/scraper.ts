// Created: 2026-03-01 00:00:00 - Playwright LinkedIn profile scraper with stealth, session management, and robust extraction.

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { loadCookies, saveCookies, StoredCookie } from './session'
import { LinkedInProfile, LinkedInExperience } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const LINKEDIN_HOST = 'https://www.linkedin.com'

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Max 10 scrapes per hour per process instance.

const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 10
const requestTimestamps: number[] = []

export function checkRateLimit(): void {
  const now = Date.now()
  // Drop timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW_MS) {
    requestTimestamps.shift()
  }
  if (requestTimestamps.length >= RATE_LIMIT) {
    throw new Object({ message: 'RATE_LIMITED: Too many requests. Max 10 scrapes per hour.', code: 'RATE_LIMITED' })
  }
  requestTimestamps.push(now)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scrollPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0
      const distance = 400
      const delay = 150
      const timer = setInterval(() => {
        window.scrollBy(0, distance)
        total += distance
        if (total >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, delay)
    })
  })
  await randomDelay(800, 1200)
}

function cleanText(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim()
}

// ── Profile extraction ────────────────────────────────────────────────────────

async function extractProfileData(page: Page): Promise<LinkedInProfile> {
  // Allow lazy-loaded content to settle
  await page.waitForTimeout(1500)

  const data = await page.evaluate((): {
    full_name: string
    headline: string
    location: string
    summary: string
    rawSkills: string[]
    rawExperiences: Array<{
      block: string
    }>
  } => {
    function text(el: Element | null): string {
      return el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    }

    function textBySelector(selector: string, root: Element | Document = document): string {
      return text(root.querySelector(selector))
    }

    function allText(selector: string, root: Element | Document = document): string[] {
      return Array.from(root.querySelectorAll(selector))
        .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter((t) => t.length > 0)
    }

    // ── Name ──
    const full_name =
      textBySelector('h1') ||
      textBySelector('.pv-top-card--list .t-24') ||
      textBySelector('[data-generated-suggestion-target] h1') ||
      ''

    // ── Headline ──
    const headline =
      textBySelector('.text-body-medium.break-words') ||
      (() => {
        const h1 = document.querySelector('h1')
        const next = h1?.nextElementSibling
        return next ? text(next) : ''
      })() ||
      ''

    // ── Location ──
    const location =
      textBySelector('.text-body-small.inline.t-black--light.break-words') ||
      textBySelector('.pv-top-card--list-bullet .t-black--light') ||
      ''

    // ── About / Summary ──
    // LinkedIn wraps the about section in a <section> near an anchor with id "about"
    const aboutSection =
      document.querySelector('#about')?.closest('section') ||
      Array.from(document.querySelectorAll('section')).find((s) =>
        s.querySelector('div')?.textContent?.includes('About')
      )

    const summary = aboutSection
      ? text(
          aboutSection.querySelector('.pv-shared-text-with-see-more') ||
            aboutSection.querySelector('.full-width') ||
            aboutSection
        )
      : ''

    // ── Skills ──
    const skillsSection =
      document.querySelector('#skills')?.closest('section') ||
      Array.from(document.querySelectorAll('section')).find((s) =>
        s.querySelector('span')?.textContent?.trim() === 'Skills'
      )

    const rawSkills: string[] = skillsSection
      ? allText('.pvs-list__item--line-separated .t-bold span[aria-hidden="true"]', skillsSection)
          .concat(
            allText('span.mr1.t-bold span[aria-hidden="true"]', skillsSection),
            allText('.pv-skill-category-entity__name-text', skillsSection)
          )
          .filter((v, i, arr) => arr.indexOf(v) === i) // dedupe
      : []

    // ── Experience ──
    const experienceSection =
      document.querySelector('#experience')?.closest('section') ||
      Array.from(document.querySelectorAll('section')).find((s) => {
        const heading = s.querySelector('h2, [role="heading"]')
        return heading?.textContent?.trim() === 'Experience'
      })

    const rawExperiences: Array<{ block: string }> = []

    if (experienceSection) {
      const items = Array.from(
        experienceSection.querySelectorAll('li.artdeco-list__item, li.pvs-list__item--line-separated')
      )
      for (const item of items) {
        const block = item.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        if (block.length > 10) rawExperiences.push({ block })
      }
    }

    return { full_name, headline, location, summary, rawSkills, rawExperiences }
  })

  const experiences = parseExperienceBlocks(data.rawExperiences.map((e) => e.block))

  return {
    full_name: cleanText(data.full_name),
    headline: cleanText(data.headline),
    location: cleanText(data.location),
    summary: cleanText(data.summary),
    skills: data.rawSkills.map(cleanText).filter((s) => s.length > 0),
    experiences,
  }
}

/**
 * LinkedIn experience list items are raw text blocks like:
 * "Senior Engineer Acme Corp · Full-time Jan 2022 - Present · 2 yrs Built the platform..."
 * We do a best-effort parse. The LLM normalization step in the edge function
 * will further clean and structure this.
 */
function parseExperienceBlocks(blocks: string[]): LinkedInExperience[] {
  return blocks.map((block) => {
    // Split on common separators
    const lines = block
      .split(/[·\n]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const title = lines[0] ?? ''
    const company = (lines[1] ?? '').replace(/Full-time|Part-time|Contract|Freelance|Self-employed/gi, '').trim()

    // Look for a date range pattern like "Jan 2020 - Dec 2022" or "2020 - Present"
    const datePattern = /(\w{0,3}\s?\d{4})\s*[-–]\s*(\w{0,3}\s?\d{4}|Present)/i
    const dateMatch = block.match(datePattern)
    const start_date = dateMatch ? dateMatch[1].trim() : undefined
    const end_date = dateMatch ? (dateMatch[2].trim().toLowerCase() === 'present' ? null : dateMatch[2].trim()) : undefined

    // Description: everything after the date line, joined
    const descStart = dateMatch ? block.indexOf(dateMatch[0]) + dateMatch[0].length : block.indexOf(company) + company.length
    const description = block.slice(descStart).replace(/\s+/g, ' ').trim()

    return { title, company, start_date, end_date, description }
  })
}

// ── Scraper class ─────────────────────────────────────────────────────────────

export class LinkedInScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,800',
      ],
    })

    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    })

    // Stealth patches — make the browser look non-automated
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', {
        get: () => ({ length: 3, item: () => ({ name: 'Chrome PDF Plugin' }) }),
      })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      // @ts-expect-error patching window.chrome for stealth
      window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}), app: {} }
    })

    const cookies = loadCookies()
    if (cookies.length > 0) {
      await this.context.addCookies(cookies)
      console.log(`[scraper] Restored ${cookies.length} session cookies`)
    } else {
      console.log('[scraper] No saved cookies found — will log in on first request')
    }
  }

  private async ensureLoggedIn(page: Page): Promise<void> {
    const email = process.env.LINKEDIN_EMAIL
    const password = process.env.LINKEDIN_PASSWORD
    if (!email || !password) {
      throw new Error('LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set as environment variables')
    }

    console.log('[scraper] Logging in to LinkedIn...')
    await page.goto(`${LINKEDIN_HOST}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await randomDelay(800, 1500)

    await page.fill('#username', email)
    await randomDelay(300, 700)
    await page.fill('#password', password)
    await randomDelay(400, 900)
    await page.click('[data-litms-control-urn="login-submit"], [type="submit"]')

    try {
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 })
    } catch {
      // If navigation didn't happen, check for error messages
      const errorText = await page.locator('.alert-content, .form__label--error').textContent().catch(() => '')
      throw new Error(`LOGIN_FAILED: ${errorText || 'Could not complete login'}`)
    }

    const postLoginUrl = page.url()
    if (postLoginUrl.includes('/checkpoint') || postLoginUrl.includes('/challenge')) {
      throw new Error(
        'VERIFICATION_REQUIRED: LinkedIn requires email/phone verification. ' +
          'Log in manually in a browser once, export the session cookies using ' +
          '"Copy cookies as JSON" (e.g. via EditThisCookie extension), base64-encode them, ' +
          'and set LINKEDIN_COOKIES in Railway.'
      )
    }

    // Persist the new session
    const rawCookies = await this.context!.cookies()
    saveCookies(rawCookies as StoredCookie[])
    console.log('[scraper] Login successful')
  }

  async scrapeProfile(linkedinUrl: string): Promise<LinkedInProfile> {
    if (!this.context) throw new Error('Scraper not initialized — call initialize() first')

    const page = await this.context.newPage()
    try {
      await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await randomDelay(800, 1500)

      // Detect session expiry / not logged in
      const currentUrl = page.url()
      if (currentUrl.includes('/login') || currentUrl.includes('/authwall')) {
        await this.ensureLoggedIn(page)
        // Re-navigate to the profile after login
        await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await randomDelay(800, 1500)
      }

      // Confirm we're on a profile page
      if (page.url().includes('/login')) {
        throw new Error('SESSION_EXPIRED: Login succeeded but profile redirect failed')
      }

      await scrollPage(page)

      // Try to expand "Show all skills" to get the full skills list
      try {
        const showAllSkills = page.locator('a[href*="/details/skills"]').first()
        if (await showAllSkills.isVisible({ timeout: 2000 })) {
          await showAllSkills.click()
          await page.waitForLoadState('domcontentloaded')
          await randomDelay(800, 1200)
          await scrollPage(page)
        }
      } catch {
        // Section may not exist — proceed with what's visible
      }

      const profile = await extractProfileData(page)

      if (!profile.full_name) {
        throw new Error('EXTRACTION_FAILED: Could not extract profile name — profile may be private or rate-limited')
      }

      return profile
    } finally {
      await page.close()
    }
  }

  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = null
    this.context = null
  }
}
