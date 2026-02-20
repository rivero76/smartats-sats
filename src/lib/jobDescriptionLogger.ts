import { createScriptLogger } from '@/lib/centralizedLogger'
import { useAuth } from '@/contexts/AuthContext'

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
  private logger: any

  constructor() {
    this.sessionId = `jd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.startTime = Date.now()
    this.logger = createJobDescriptionLogger(this.sessionId)
  }

  log(level: 'info' | 'debug' | 'error', message: string, metadata?: any) {
    const enrichedMetadata = {
      ...metadata,
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    }

    this.logger[level](message, enrichedMetadata)
  }

  info(message: string, metadata?: any) {
    this.log('info', message, metadata)
  }

  debug(message: string, metadata?: any) {
    this.log('debug', message, metadata)
  }

  error(message: string, metadata?: any) {
    this.log('error', message, metadata)
  }

  startProcess(processName: string, metadata?: any) {
    this.info(`Starting ${processName}`, {
      process: processName,
      processStep: 'start',
      ...metadata,
    })
  }

  completeProcess(processName: string, metadata?: any) {
    this.info(`Completed ${processName}`, {
      process: processName,
      processStep: 'complete',
      duration: Date.now() - this.startTime,
      ...metadata,
    })
  }

  errorProcess(processName: string, error: Error, metadata?: any) {
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
export const logJobDescriptionCreation = (data: any, sessionId?: string) => {
  const logger = createJobDescriptionLogger(sessionId)
  logger.info('Job description creation initiated', {
    hasName: !!data.name,
    hasCompany: !!data.company_id,
    hasLocation: !!data.location_id,
    inputMethod: data.pasted_text ? 'text' : data.file_url ? 'file' : 'unknown',
    dataSize: data.pasted_text?.length || 0,
  })
}

export const logContentExtraction = (content: string, extractedData: any, sessionId?: string) => {
  const logger = createContentExtractionLogger(sessionId)
  logger.info('Content extraction completed', {
    contentLength: content.length,
    extractedFields: {
      title: !!extractedData.title,
      company: !!extractedData.company,
      location: !!extractedData.location,
      skills: extractedData.skills?.length || 0,
      employmentType: !!extractedData.employmentType,
      department: !!extractedData.department,
    },
    extractionSuccess: !!(extractedData.title || extractedData.company),
  })
}

export const logCompanyLocationOperation = (
  operation: 'lookup' | 'create',
  type: 'company' | 'location',
  data: any,
  result: any,
  sessionId?: string
) => {
  const logger = createCompanyLocationLogger(sessionId)
  logger.info(`${type} ${operation} operation`, {
    operation,
    type,
    inputData: data,
    success: !!result,
    resultId: result?.id,
    operationDetails: {
      isExisting: operation === 'lookup' && !!result,
      isNew: operation === 'create' && !!result,
    },
  })
}
