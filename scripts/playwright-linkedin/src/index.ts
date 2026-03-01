// Created: 2026-03-01 00:00:00 - Express HTTP server exposing POST /scrape-profile for the Playwright LinkedIn scraper.

import express, { Request, Response, NextFunction } from 'express'
import { LinkedInScraper, checkRateLimit } from './scraper'
import { ScrapeRequest, ScrapeResult } from './types'

const PORT = Number(process.env.PORT ?? 3000)
const API_KEY = process.env.PLAYWRIGHT_API_KEY ?? ''

if (!API_KEY) {
  console.error('[startup] PLAYWRIGHT_API_KEY env var is not set. Refusing to start.')
  process.exit(1)
}
if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
  console.error('[startup] LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars are required.')
  process.exit(1)
}

// ── Scraper singleton ─────────────────────────────────────────────────────────

const scraper = new LinkedInScraper()

async function boot(): Promise<void> {
  console.log('[startup] Initializing Playwright browser...')
  await scraper.initialize()
  console.log('[startup] Browser ready')
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express()
app.use(express.json({ limit: '64kb' }))

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'] ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!token || token !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' })
    return
  }
  next()
}

// ── Input validation ──────────────────────────────────────────────────────────

function validateLinkedInUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (!url.hostname.endsWith('linkedin.com')) return null
    if (!url.pathname.startsWith('/in/')) return null
    return url.toString()
  } catch {
    return null
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'smartats-linkedin-scraper' })
})

app.post('/scrape-profile', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Partial<ScrapeRequest>
  const rawUrl = String(body?.url ?? '').trim()

  const validUrl = validateLinkedInUrl(rawUrl)
  if (!validUrl) {
    res.status(400).json({
      success: false,
      error: 'url must be a valid https://www.linkedin.com/in/... profile URL',
      code: 'INVALID_URL',
    } satisfies ScrapeResult)
    return
  }

  // Rate limit
  try {
    checkRateLimit()
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string }
    res.status(429).json({
      success: false,
      error: e.message ?? 'Rate limit exceeded',
      code: e.code ?? 'RATE_LIMITED',
    } satisfies ScrapeResult)
    return
  }

  console.log(`[request] Scraping profile: ${validUrl}`)

  try {
    const profile = await scraper.scrapeProfile(validUrl)

    const result: ScrapeResult = {
      success: true,
      profile,
      scraped_at: new Date().toISOString(),
    }
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[request] Scrape failed: ${message}`)

    // Map known error strings to structured codes
    const code = message.startsWith('VERIFICATION_REQUIRED')
      ? 'VERIFICATION_REQUIRED'
      : message.startsWith('LOGIN_FAILED')
        ? 'LOGIN_FAILED'
        : message.startsWith('SESSION_EXPIRED')
          ? 'SESSION_EXPIRED'
          : message.startsWith('EXTRACTION_FAILED')
            ? 'EXTRACTION_FAILED'
            : 'SCRAPE_ERROR'

    const statusCode = code === 'VERIFICATION_REQUIRED' ? 503 : 500

    res.status(statusCode).json({
      success: false,
      error: message,
      code,
    } satisfies ScrapeResult)
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────

boot()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[startup] LinkedIn scraper service listening on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[startup] Failed to initialize browser:', err)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[shutdown] SIGTERM received — closing browser')
  await scraper.close()
  process.exit(0)
})
