import { createScriptLogger } from './centralizedLogger'

type LogMetadata = Record<string, unknown>

interface ExtractionResultLike {
  wordCount?: number
  warnings?: unknown[]
  metadata?: LogMetadata
}

function toRecord(value: unknown): LogMetadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as LogMetadata)
    : {}
}

function toErrorLike(error: unknown): {
  name: string
  message: string
  stack: string | null
  code: string | null
} {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: unknown }
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error occurred',
      stack: error.stack || null,
      code: typeof withCode.code === 'string' ? withCode.code : null,
    }
  }

  const asRecord = toRecord(error)
  return {
    name: typeof asRecord.name === 'string' ? asRecord.name : 'UnknownError',
    message: typeof asRecord.message === 'string' ? asRecord.message : String(error),
    stack: typeof asRecord.stack === 'string' ? asRecord.stack : null,
    code: typeof asRecord.code === 'string' ? asRecord.code : null,
  }
}

// Specialized loggers for document processing
export const documentProcessingLogger = createScriptLogger('document-processing')
export const fileUploadLogger = createScriptLogger('file-upload')
export const resumeProcessingLogger = createScriptLogger('resume-processing')
export const pdfWorkerLogger = createScriptLogger('pdf-worker')

// Helper function to generate processing session ID
export function generateProcessingSessionId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Helper to log file metadata
export function logFileMetadata(sessionId: string, file: File | Blob, action: string) {
  const metadata = {
    sessionId,
    fileName: (file as File).name || 'unknown',
    fileSize: file.size,
    fileType: file.type,
    action,
    timestamp: new Date().toISOString(),
  }

  fileUploadLogger.info(`File ${action}: ${metadata.fileName}`, metadata)
  return metadata
}

// Helper to log processing stages
export function logProcessingStage(
  sessionId: string,
  stage: string,
  status: 'started' | 'completed' | 'failed',
  metadata?: LogMetadata
) {
  const logData = {
    sessionId,
    stage,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  }

  if (status === 'failed') {
    documentProcessingLogger.error(`Processing ${stage} failed`, logData)
  } else {
    documentProcessingLogger.info(`Processing ${stage} ${status}`, logData)
  }

  return logData
}

// Helper to log extraction results
export function logExtractionResult(
  sessionId: string,
  result: ExtractionResultLike,
  method: string
) {
  const resultMetadata = toRecord(result.metadata)
  const metadata = {
    sessionId,
    method,
    wordCount: result.wordCount || 0,
    hasWarnings: result.warnings?.length > 0,
    warningCount: result.warnings?.length || 0,
    fileSize: typeof resultMetadata.fileSize === 'number' ? resultMetadata.fileSize : 0,
    detectedMimeType:
      typeof resultMetadata.detectedMimeType === 'string'
        ? resultMetadata.detectedMimeType
        : undefined,
    timestamp: new Date().toISOString(),
  }

  documentProcessingLogger.info(`Text extraction completed using ${method}`, metadata)

  if (result.warnings?.length > 0) {
    documentProcessingLogger.debug(`Extraction warnings for session ${sessionId}`, {
      sessionId,
      warnings: result.warnings,
    })
  }

  return metadata
}

// Helper to log PDF worker events
export function logPDFWorkerEvent(event: string, data?: LogMetadata) {
  const metadata = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  }

  pdfWorkerLogger.info(`PDF Worker: ${event}`, metadata)
  return metadata
}

// Helper to log errors with context
export function logProcessingError(
  sessionId: string,
  stage: string,
  error: unknown,
  context?: LogMetadata
) {
  const err = toErrorLike(error)
  const errorMetadata = {
    sessionId,
    stage,
    errorType: err.name,
    errorMessage: err.message,
    errorCode: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ...context,
  }

  documentProcessingLogger.error(`Processing error in ${stage}`, errorMetadata)
  return errorMetadata
}
