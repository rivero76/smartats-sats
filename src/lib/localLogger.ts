/**
 * localLogger.ts
 * --------------------------------------------------------
 * Local filesystem logger for SmartATS.
 * Works only in Node.js (backend or CLI). Safe in browser.
 * --------------------------------------------------------
 */

export async function writeLocalLog(
  level: string,
  message: string,
  metadata?: unknown,
  script?: string
): Promise<void> {
  // Skip logging in browser (no filesystem)
  if (typeof window !== 'undefined') {
    console.debug(`[localLogger] Browser environment — skipping file write`)
    return
  }

  try {
    const fs = await import('fs')
    const path = await import('path')

    const logDir = path.resolve(process.cwd(), 'logs')
    const logFile = path.join(logDir, `sats_app_${new Date().toISOString().slice(0, 10)}.log`)

    // Ensure the directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const timestamp = new Date().toISOString()
    const entry = `[${timestamp}] [${level}] [${script || 'unspecified'}] ${message} ${
      metadata ? JSON.stringify(metadata) : ''
    }\n`

    fs.appendFileSync(logFile, entry, 'utf8')
    console.log(`[localLogger] ${message}`)
  } catch (err) {
    console.error('[localLogger] Failed to write local log:', err)
  }
}
