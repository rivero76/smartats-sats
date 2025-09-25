import { createScriptLogger } from './centralizedLogger';

// Specialized loggers for document processing
export const documentProcessingLogger = createScriptLogger('document-processing');
export const fileUploadLogger = createScriptLogger('file-upload');
export const resumeProcessingLogger = createScriptLogger('resume-processing');
export const pdfWorkerLogger = createScriptLogger('pdf-worker');

// Helper function to generate processing session ID
export function generateProcessingSessionId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
  };
  
  fileUploadLogger.info(`File ${action}: ${metadata.fileName}`, metadata);
  return metadata;
}

// Helper to log processing stages
export function logProcessingStage(
  sessionId: string, 
  stage: string, 
  status: 'started' | 'completed' | 'failed', 
  metadata?: any
) {
  const logData = {
    sessionId,
    stage,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  if (status === 'failed') {
    documentProcessingLogger.error(`Processing ${stage} failed`, logData);
  } else {
    documentProcessingLogger.info(`Processing ${stage} ${status}`, logData);
  }
  
  return logData;
}

// Helper to log extraction results
export function logExtractionResult(sessionId: string, result: any, method: string) {
  const metadata = {
    sessionId,
    method,
    wordCount: result.wordCount || 0,
    hasWarnings: result.warnings?.length > 0,
    warningCount: result.warnings?.length || 0,
    fileSize: result.metadata?.fileSize || 0,
    detectedMimeType: result.metadata?.detectedMimeType,
    timestamp: new Date().toISOString(),
  };
  
  documentProcessingLogger.info(`Text extraction completed using ${method}`, metadata);
  
  if (result.warnings?.length > 0) {
    documentProcessingLogger.debug(`Extraction warnings for session ${sessionId}`, {
      sessionId,
      warnings: result.warnings,
    });
  }
  
  return metadata;
}

// Helper to log PDF worker events
export function logPDFWorkerEvent(event: string, data?: any) {
  const metadata = {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  pdfWorkerLogger.info(`PDF Worker: ${event}`, metadata);
  return metadata;
}

// Helper to log errors with context
export function logProcessingError(sessionId: string, stage: string, error: any, context?: any) {
  const errorMetadata = {
    sessionId,
    stage,
    errorType: error.constructor?.name || 'UnknownError',
    errorMessage: error.message || 'Unknown error occurred',
    errorCode: error.code || null,
    stack: error.stack || null,
    timestamp: new Date().toISOString(),
    ...context,
  };
  
  documentProcessingLogger.error(`Processing error in ${stage}`, errorMetadata);
  return errorMetadata;
}