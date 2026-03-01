// Created: 2026-03-01 00:00:00 - Cookie session persistence for LinkedIn scraper.
// Loads cookies from LINKEDIN_COOKIES env var (base64 JSON) and persists
// to /tmp during the process lifetime. Logs the new base64 value after
// each login so the user can update the Railway env var.

import { readFileSync, writeFileSync, existsSync } from 'fs'

const COOKIE_FILE = '/tmp/linkedin_session.json'

export interface StoredCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export function loadCookies(): StoredCookie[] {
  // Prefer the in-process file (updated after login during this run)
  if (existsSync(COOKIE_FILE)) {
    try {
      const raw = readFileSync(COOKIE_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as StoredCookie[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // fall through
    }
  }

  // Fall back to env var (set from a previous deployment's cookie export)
  const envValue = process.env.LINKEDIN_COOKIES
  if (envValue) {
    try {
      const decoded = Buffer.from(envValue, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded) as StoredCookie[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        writeCookieFile(parsed)
        return parsed
      }
    } catch {
      // fall through
    }
  }

  return []
}

export function saveCookies(cookies: StoredCookie[]): void {
  writeCookieFile(cookies)
  const base64 = Buffer.from(JSON.stringify(cookies)).toString('base64')
  // Log so the operator can copy this into the LINKEDIN_COOKIES env var
  // to survive Railway restarts without re-logging in.
  console.log('[session] New session cookies saved.')
  console.log('[session] Update LINKEDIN_COOKIES env var in Railway with the value below:')
  console.log(`LINKEDIN_COOKIES=${base64}`)
}

function writeCookieFile(cookies: StoredCookie[]): void {
  try {
    writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[session] Could not write cookie file:', err)
  }
}
