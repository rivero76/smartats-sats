import { createScriptLogger } from '@/lib/centralizedLogger'

type LogMetadata = Record<string, unknown>

function toRecord(value: unknown): LogMetadata {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as LogMetadata)
    : {}
}

// Create specialized loggers for job description processes
export const createJobDescriptionLogger = (sessionId?: string) => {
  return createScriptLogger('job-description-ingest', { sessionId })
}

export const createContentExtractionLogger = (sessionId?: string) => {
  return createScriptLogger('content-extraction', { sessionId })
}

export const createCompanyLocationLogger = (sessionId?: string) => {
  return createScriptLogger('company-location-management', { sessionId })
}

// Session management for tracking related operations
export class JobDescriptionSession {
  private sessionId: string
  private startTime: number
  private logger: ReturnType<typeof createScriptLogger>

  constructor() {
    this.sessionId = `jd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.startTime = Date.now()
    this.logger = createJobDescriptionLogger(this.sessionId)
  }

  log(level: 'info' | 'debug' | 'error', message: string, metadata?: LogMetadata) {
    const enrichedMetadata = {
      ...toRecord(metadata),
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    }

    if (level === 'error') {
      this.logger.error(message, enrichedMetadata)
      return
    }
    if (level === 'debug') {
      this.logger.debug(message, enrichedMetadata)
      return
    }
    this.logger.info(message, enrichedMetadata)
  }

  info(message: string, metadata?: LogMetadata) {
    this.log('info', message, metadata)
  }

  debug(message: string, metadata?: LogMetadata) {
    this.log('debug', message, metadata)
  }

  error(message: string, metadata?: LogMetadata) {
    this.log('error', message, metadata)
  }

  startProcess(processName: string, metadata?: LogMetadata) {
    this.info(`Starting ${processName}`, {
      process: processName,
      processStep: 'start',
      ...metadata,
    })
  }

  completeProcess(processName: string, metadata?: LogMetadata) {
    this.info(`Completed ${processName}`, {
      process: processName,
      processStep: 'complete',
      duration: Date.now() - this.startTime,
      ...metadata,
    })
  }

  errorProcess(processName: string, error: Error, metadata?: LogMetadata) {
    this.error(`Failed ${processName}`, {
      process: processName,
      processStep: 'error',
      error: error.message,
      errorStack: error.stack,
      duration: Date.now() - this.startTime,
      ...metadata,
    })
  }

  getSessionId(): string {
    return this.sessionId
  }
}

// Utility functions for common logging scenarios
export const logJobDescriptionCreation = (data: unknown, sessionId?: string) => {
  const payload = toRecord(data)
  const logger = createJobDescriptionLogger(sessionId)
  logger.info('Job description creation initiated', {
    hasName: !!payload.name,
    hasCompany: !!payload.company_id,
    hasLocation: !!payload.location_id,
    inputMethod: payload.pasted_text ? 'text' : payload.file_url ? 'file' : 'unknown',
    dataSize: typeof payload.pasted_text === 'string' ? payload.pasted_text.length : 0,
  })
}

export const logContentExtraction = (
  content: string,
  extractedData: unknown,
  sessionId?: string
) => {
  const payload = toRecord(extractedData)
  const skills = Array.isArray(payload.skills) ? payload.skills : []
  const logger = createContentExtractionLogger(sessionId)
  logger.info('Content extraction completed', {
    contentLength: content.length,
    extractedFields: {
      title: !!payload.title,
      company: !!payload.company,
      location: !!payload.location,
      skills: skills.length,
      employmentType: !!payload.employmentType,
      department: !!payload.department,
    },
    extractionSuccess: !!(payload.title || payload.company),
  })
}

export const logCompanyLocationOperation = (
  operation: 'lookup' | 'create',
  type: 'company' | 'location',
  data: unknown,
  result: unknown,
  sessionId?: string
) => {
  const resultPayload = toRecord(result)
  const logger = createCompanyLocationLogger(sessionId)
  logger.info(`${type} ${operation} operation`, {
    operation,
    type,
    inputData: data,
    success: !!resultPayload.id,
    resultId: typeof resultPayload.id === 'string' ? resultPayload.id : undefined,
    operationDetails: {
      isExisting: operation === 'lookup' && !!resultPayload.id,
      isNew: operation === 'create' && !!resultPayload.id,
    },
  })
}
