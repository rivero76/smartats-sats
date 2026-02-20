/**
 * UPDATE LOG
 * 2026-02-20 23:29:40 | P2: Added request_id correlation and total-duration telemetry for document extraction.
 */
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import { convert as htmlToText } from 'html-to-text'
import {
  documentProcessingLogger,
  pdfWorkerLogger,
  logProcessingStage,
  logProcessingError,
  generateProcessingSessionId,
} from '@/lib/documentLogger'
import { createRequestId, getDurationMs } from '@/lib/requestContext'

/**
 * PDF.js worker configuration — LOCAL worker served by Vite from /public.
 * We avoid CDN sources to eliminate CORS / sandbox issues in local dev and prod.
 */

const LOCAL_WORKER_PATH = '/pdfjs/pdf.worker.min.js'

let workerInitialized = false

try {
  // Use the ESM worker file we copied to /public/pdfjs
  pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_PATH
  workerInitialized = true
  pdfWorkerLogger.info('Using local PDF.js worker', { workerSrc: LOCAL_WORKER_PATH })
} catch (e) {
  // Extremely defensive fallback: inline mode (slower, but avoids hard failure)
  workerInitialized = false
  pdfWorkerLogger.error('Failed to initialize PDF.js worker; falling back to inline mode', {
    error: e,
  })
  ;(pdfjsLib.GlobalWorkerOptions as any).workerPort = null
}

export interface ExtractedContent {
  text: string
  wordCount: number
  method: 'mammoth' | 'pdfjs-dist' | 'html-to-text' | 'text' | 'docx-fallback'
  warnings: string[]
  metadata?: {
    pages?: number
    fileSize: number
    detectedMimeType: string
  }
}

export interface ProcessingError {
  code:
    | 'UNSUPPORTED_FORMAT'
    | 'EXTRACTION_FAILED'
    | 'FILE_TOO_LARGE'
    | 'CORRUPTED_FILE'
    | 'ENCRYPTED_FILE'
  message: string
  originalError?: Error
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit

// File signature detection for reliable MIME type detection
const FILE_SIGNATURES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  DOCX: [0x50, 0x4b, 0x03, 0x04], // ZIP signature (DOCX is a ZIP file)
  HTML: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45], // <!DOCTYPE
  HTML_ALT: [0x3c, 0x68, 0x74, 0x6d, 0x6c], // <html
} as const

function detectFileType(buffer: ArrayBuffer, filename?: string): string {
  const uint8Array = new Uint8Array(buffer)
  const first16Bytes = Array.from(uint8Array.slice(0, 16))

  // PDF
  if (first16Bytes.slice(0, 4).every((b, i) => b === FILE_SIGNATURES.PDF[i])) {
    return 'application/pdf'
  }
  // DOCX (ZIP)
  if (first16Bytes.slice(0, 4).every((b, i) => b === FILE_SIGNATURES.DOCX[i])) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  // HTML
  if (
    first16Bytes.slice(0, 9).every((b, i) => b === FILE_SIGNATURES.HTML[i]) ||
    first16Bytes.slice(0, 5).every((b, i) => b === FILE_SIGNATURES.HTML_ALT[i])
  ) {
    return 'text/html'
  }
  // Plain text heuristic (first 512 bytes)
  const sample = uint8Array.slice(0, Math.min(512, uint8Array.length))
  const isText = sample.every(
    (byte) =>
      (byte >= 32 && byte <= 126) || // Printable ASCII
      byte === 9 ||
      byte === 10 ||
      byte === 13 // Tab, LF, CR
  )
  if (isText) return 'text/plain'

  // Fallback by extension
  const ext = filename?.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'html':
    case 'htm':
      return 'text/html'
    case 'txt':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}

async function extractFromPDF(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId()

  try {
    pdfWorkerLogger.info('Starting PDF extraction', {
      sessionId: session,
      fileSize: buffer.byteLength,
      workerInitialized,
    })

    const uint8Array = new Uint8Array(buffer)

    logProcessingStage(session, 'pdf-loading', 'started')
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
      cMapPacked: true,
      verbosity: 0,
    })

    loadingTask.onPassword = () => {
      pdfWorkerLogger.error('PDF requires password', { sessionId: session })
      throw new Error('PDF is password protected and cannot be processed')
    }

    const pdf = await loadingTask.promise

    logProcessingStage(session, 'pdf-loading', 'completed', { numPages: pdf.numPages })
    const totalPages = pdf.numPages

    logProcessingStage(session, 'pdf-text-extraction', 'started', { totalPages })

    const pagePromises: Promise<string>[] = []
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pagePromise = pdf.getPage(pageNum).then(async (page) => {
        try {
          const textContent = await page.getTextContent()
          return textContent.items.map((item: any) => item.str).join(' ')
        } catch (pageError) {
          pdfWorkerLogger.debug(`Failed to extract text from page ${pageNum}`, {
            sessionId: session,
            pageNum,
            error: pageError instanceof Error ? pageError.message : String(pageError),
          })
          return ''
        }
      })
      pagePromises.push(pagePromise)
    }

    const pageTexts = await Promise.all(pagePromises)
    const fullText = pageTexts.join('\n').trim()

    logProcessingStage(session, 'pdf-text-extraction', 'completed', {
      extractedLength: fullText.length,
      successfulPages: pageTexts.filter((t) => t.length > 0).length,
    })

    const warnings: string[] = []
    const avgTextPerPage = totalPages ? fullText.length / totalPages : 0
    if (avgTextPerPage < 50) {
      warnings.push(
        'This PDF may contain scanned images. Consider using OCR for better text extraction.'
      )
    }

    return {
      text: fullText,
      wordCount: fullText.split(/\s+/).filter((w) => w.length > 0).length,
      method: 'pdfjs-dist',
      warnings,
      metadata: {
        pages: totalPages,
        fileSize: buffer.byteLength,
        detectedMimeType: 'application/pdf',
      },
    }
  } catch (error) {
    logProcessingError(session, 'pdf-extraction', error)

    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF structure') || error.message.includes('PDF header')) {
        throw new Error(`PDF file appears to be corrupted or invalid: ${error.message}`)
      } else if (error.message.toLowerCase().includes('worker')) {
        pdfWorkerLogger.error('PDF worker failed to load', {
          sessionId: session,
          error: error.message,
        })
        throw new Error(
          `PDF processing failed: Unable to load PDF worker. This may be due to network issues or browser compatibility.`
        )
      } else if (error.message.toLowerCase().includes('password')) {
        throw new Error(`PDF extraction failed: Document is password protected`)
      }
    }
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

async function extractFromDOCX(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId()

  try {
    logProcessingStage(session, 'docx-extraction', 'started', { fileSize: buffer.byteLength })
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })

    const warnings: string[] = []
    if (result.messages.length > 0) {
      warnings.push('Some formatting may have been lost during extraction.')
    }

    return {
      text: result.value.trim(),
      wordCount: result.value.trim().split(/\s+/).length,
      method: 'mammoth',
      warnings,
      metadata: {
        fileSize: buffer.byteLength,
        detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    }
  } catch (error) {
    logProcessingError(session, 'docx-mammoth-extraction', error)
    try {
      documentProcessingLogger.info('Attempting DOCX fallback extraction', { sessionId: session })
      return await extractFromDOCXFallback(buffer, session)
    } catch (fallbackError) {
      logProcessingError(session, 'docx-fallback-extraction', fallbackError)
      throw new Error(
        `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

async function extractFromDOCXFallback(
  buffer: ArrayBuffer,
  sessionId?: string
): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId()

  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')?.async('text')
  if (!documentXml) throw new Error('Invalid DOCX file structure')

  const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)</g)
  const extractedText = textMatches
    ? textMatches.map((m) => m.replace(/<w:t[^>]*>([^<]*)</, '$1')).join(' ')
    : ''

  return {
    text: extractedText.trim(),
    wordCount: extractedText.trim().split(/\s+/).length,
    method: 'docx-fallback',
    warnings: ['Used fallback extraction method. Some formatting may be missing.'],
    metadata: {
      fileSize: buffer.byteLength,
      detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  }
}

async function extractFromHTML(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId()

  logProcessingStage(session, 'html-extraction', 'started', { fileSize: buffer.byteLength })
  const decoder = new TextDecoder('utf-8')
  const htmlContent = decoder.decode(buffer)

  const text = htmlToText(htmlContent, {
    wordwrap: false,
    ignoreHref: true,
    ignoreImage: true,
  })

  return {
    text: text.trim(),
    wordCount: text.trim().split(/\s+/).length,
    method: 'html-to-text',
    warnings: [],
    metadata: {
      fileSize: buffer.byteLength,
      detectedMimeType: 'text/html',
    },
  }
}

async function extractFromText(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId()

  logProcessingStage(session, 'text-extraction', 'started', { fileSize: buffer.byteLength })
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(buffer)

  return {
    text: text.trim(),
    wordCount: text.trim().split(/\s+/).length,
    method: 'text',
    warnings: [],
    metadata: {
      fileSize: buffer.byteLength,
      detectedMimeType: 'text/plain',
    },
  }
}

export async function extractTextFromDocument(
  file: File | Blob,
  filename?: string
): Promise<ExtractedContent> {
  const sessionId = generateProcessingSessionId()
  const requestId = createRequestId('doc-extract')
  const startedAt = Date.now()

  try {
    documentProcessingLogger.info('Starting document extraction', {
      sessionId,
      request_id: requestId,
      fileName: filename || (file as File).name || 'unknown',
      fileSize: file.size,
      fileType: (file as File).type,
    })

    if (file.size > MAX_FILE_SIZE) {
      const error: ProcessingError = {
        code: 'FILE_TOO_LARGE',
        message: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`,
      }
      throw error
    }

    const buffer = await file.arrayBuffer()
    const detectedMimeType = detectFileType(buffer, filename || (file as File).name)

    documentProcessingLogger.info('File type detected', {
      sessionId,
      detectedMimeType,
      originalType: (file as File).type,
    })

    let result: ExtractedContent
    switch (detectedMimeType) {
      case 'application/pdf':
        result = await extractFromPDF(buffer, sessionId)
        break
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        result = await extractFromDOCX(buffer, sessionId)
        break
      case 'text/html':
        result = await extractFromHTML(buffer, sessionId)
        break
      case 'text/plain':
        result = await extractFromText(buffer, sessionId)
        break
      default:
        logProcessingError(sessionId, 'format-detection', {
          code: 'UNSUPPORTED_FORMAT',
          detectedMimeType,
        })
        const err: ProcessingError = {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format: ${detectedMimeType}. Supported formats: PDF, DOCX, HTML, TXT.`,
        }
        throw err
    }

    documentProcessingLogger.info('Document extraction completed successfully', {
      sessionId,
      request_id: requestId,
      method: result.method,
      wordCount: result.wordCount,
      hasWarnings: result.warnings.length > 0,
      duration_ms: getDurationMs(startedAt),
    })

    return result
  } catch (error) {
    logProcessingError(sessionId, 'document-extraction', error, {
      request_id: requestId,
      duration_ms: getDurationMs(startedAt),
    })

    if ((error as any)?.code) {
      throw error // Known ProcessingError
    }

    const processingError: ProcessingError = {
      code: 'EXTRACTION_FAILED',
      message: `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalError: error instanceof Error ? error : undefined,
    }
    throw processingError
  }
}

export function isProcessingError(error: any): error is ProcessingError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error
}
