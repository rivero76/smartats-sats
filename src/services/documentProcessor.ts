import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { convert as htmlToText } from 'html-to-text';
import { 
  documentProcessingLogger, 
  pdfWorkerLogger, 
  logProcessingStage,
  logProcessingError,
  generateProcessingSessionId 
} from '@/lib/documentLogger';

// Fix PDF.js worker configuration - use local worker instead of CDN
const setupPDFWorker = () => {
  try {
    // Try to use local worker first (more reliable)
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
    pdfWorkerLogger.info('PDF worker configured with local worker');
  } catch (error) {
    // Fallback to CDN if local worker fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfWorkerLogger.info('PDF worker configured with CDN fallback', { 
      cdnUrl: pdfjsLib.GlobalWorkerOptions.workerSrc 
    });
  }
};

// Initialize PDF worker on module load
setupPDFWorker();

export interface ExtractedContent {
  text: string;
  wordCount: number;
  method: 'mammoth' | 'pdfjs-dist' | 'html-to-text' | 'text' | 'docx-fallback';
  warnings: string[];
  metadata?: {
    pages?: number;
    fileSize: number;
    detectedMimeType: string;
  };
}

export interface ProcessingError {
  code: 'UNSUPPORTED_FORMAT' | 'EXTRACTION_FAILED' | 'FILE_TOO_LARGE' | 'CORRUPTED_FILE' | 'ENCRYPTED_FILE';
  message: string;
  originalError?: Error;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// File signature detection for reliable MIME type detection
const FILE_SIGNATURES = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  DOCX: [0x50, 0x4B, 0x03, 0x04], // ZIP signature (DOCX is a ZIP file)
  HTML: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45], // <!DOCTYPE
  HTML_ALT: [0x3C, 0x68, 0x74, 0x6D, 0x6C], // <html
} as const;

function detectFileType(buffer: ArrayBuffer, filename?: string): string {
  const uint8Array = new Uint8Array(buffer);
  const first16Bytes = Array.from(uint8Array.slice(0, 16));

  // Check PDF signature
  if (first16Bytes.slice(0, 4).every((byte, i) => byte === FILE_SIGNATURES.PDF[i])) {
    return 'application/pdf';
  }

  // Check DOCX signature (ZIP file)
  if (first16Bytes.slice(0, 4).every((byte, i) => byte === FILE_SIGNATURES.DOCX[i])) {
    // Further verify it's DOCX by checking for specific internal structure
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // Check HTML signatures
  if (first16Bytes.slice(0, 9).every((byte, i) => byte === FILE_SIGNATURES.HTML[i]) ||
      first16Bytes.slice(0, 5).every((byte, i) => byte === FILE_SIGNATURES.HTML_ALT[i])) {
    return 'text/html';
  }

  // Check if it's plain text (no binary characters in first 512 bytes)
  const sample = uint8Array.slice(0, Math.min(512, uint8Array.length));
  const isText = sample.every(byte => 
    (byte >= 32 && byte <= 126) || // Printable ASCII
    byte === 9 || byte === 10 || byte === 13 // Tab, LF, CR
  );

  if (isText) {
    return 'text/plain';
  }

  // Fallback to filename extension
  const ext = filename?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'html': case 'htm': return 'text/html';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

async function extractFromPDF(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId();
  
  try {
    pdfWorkerLogger.info('Starting PDF extraction', { sessionId: session, fileSize: buffer.byteLength });
    
    // Load PDF document using pdfjs-dist
    const uint8Array = new Uint8Array(buffer);
    
    logProcessingStage(session, 'pdf-loading', 'started');
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
      cMapPacked: true,
      verbosity: 0, // Reduce PDF.js console output
    });
    
    // Add promise rejection handler for better error reporting
    loadingTask.onPassword = () => {
      pdfWorkerLogger.error('PDF requires password', { sessionId: session });
      throw new Error('PDF is password protected and cannot be processed');
    };
    
    const pdf = await loadingTask.promise;
    logProcessingStage(session, 'pdf-loading', 'completed', { numPages: pdf.numPages });
    const totalPages = pdf.numPages;
    
    logProcessingStage(session, 'pdf-text-extraction', 'started', { totalPages });
    
    // Extract text from all pages
    const pagePromises: Promise<string>[] = [];
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pagePromise = pdf.getPage(pageNum).then(async (page) => {
        try {
          const textContent = await page.getTextContent();
          return textContent.items
            .map((item: any) => item.str)
            .join(' ');
        } catch (pageError) {
          pdfWorkerLogger.debug(`Failed to extract text from page ${pageNum}`, { 
            sessionId: session, 
            pageNum, 
            error: pageError instanceof Error ? pageError.message : String(pageError) 
          });
          return ''; // Skip problematic pages
        }
      });
      pagePromises.push(pagePromise);
    }
    
    const pageTexts = await Promise.all(pagePromises);
    const fullText = pageTexts.join('\n').trim();
    
    logProcessingStage(session, 'pdf-text-extraction', 'completed', { 
      extractedLength: fullText.length,
      successfulPages: pageTexts.filter(text => text.length > 0).length 
    });
    
    const warnings: string[] = [];
    
    // Check if PDF might be scanned (low text-to-page ratio)
    const avgTextPerPage = fullText.length / totalPages;
    if (avgTextPerPage < 50) {
      warnings.push('This PDF may contain scanned images. Consider using OCR for better text extraction.');
    }

    return {
      text: fullText,
      wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
      method: 'pdfjs-dist',
      warnings,
      metadata: {
        pages: totalPages,
        fileSize: buffer.byteLength,
        detectedMimeType: 'application/pdf',
      },
    };
  } catch (error) {
    logProcessingError(session, 'pdf-extraction', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF structure') || error.message.includes('PDF header')) {
        throw new Error(`PDF file appears to be corrupted or invalid: ${error.message}`);
      } else if (error.message.includes('worker')) {
        pdfWorkerLogger.error('PDF worker failed to load', { sessionId: session, error: error.message });
        throw new Error(`PDF processing failed: Unable to load PDF worker. This may be due to network issues or browser compatibility.`);
      } else if (error.message.includes('password')) {
        throw new Error(`PDF extraction failed: Document is password protected`);
      }
    }
    
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractFromDOCX(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId();
  
  try {
    logProcessingStage(session, 'docx-extraction', 'started', { fileSize: buffer.byteLength });
    // Try primary extraction with mammoth
    const uint8Array = new Uint8Array(buffer);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    
    const warnings: string[] = [];
    if (result.messages.length > 0) {
      warnings.push('Some formatting may have been lost during extraction.');
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
    };
  } catch (error) {
    logProcessingError(session, 'docx-mammoth-extraction', error);
    
    // Fallback to manual DOCX parsing
    try {
      documentProcessingLogger.info('Attempting DOCX fallback extraction', { sessionId: session });
      return await extractFromDOCXFallback(buffer, session);
    } catch (fallbackError) {
      logProcessingError(session, 'docx-fallback-extraction', fallbackError);
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function extractFromDOCXFallback(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId();
  
  try {
    logProcessingStage(session, 'docx-fallback', 'started');
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('text');
    
    if (!documentXml) {
      throw new Error('Invalid DOCX file structure');
    }

    // Extract text from XML using regex (simple but effective)
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)</g);
    const extractedText = textMatches
      ? textMatches.map(match => match.replace(/<w:t[^>]*>([^<]*)</, '$1')).join(' ')
      : '';

    return {
      text: extractedText.trim(),
      wordCount: extractedText.trim().split(/\s+/).length,
      method: 'docx-fallback',
      warnings: ['Used fallback extraction method. Some formatting may be missing.'],
      metadata: {
        fileSize: buffer.byteLength,
        detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    };
  } catch (error) {
    throw new Error(`DOCX fallback extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractFromHTML(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId();
  
  try {
    logProcessingStage(session, 'html-extraction', 'started', { fileSize: buffer.byteLength });
    const decoder = new TextDecoder('utf-8');
    const htmlContent = decoder.decode(buffer);
    
    const text = htmlToText(htmlContent, {
      wordwrap: false,
      ignoreHref: true,
      ignoreImage: true,
    });

    return {
      text: text.trim(),
      wordCount: text.trim().split(/\s+/).length,
      method: 'html-to-text',
      warnings: [],
      metadata: {
        fileSize: buffer.byteLength,
        detectedMimeType: 'text/html',
      },
    };
  } catch (error) {
    throw new Error(`HTML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractFromText(buffer: ArrayBuffer, sessionId?: string): Promise<ExtractedContent> {
  const session = sessionId || generateProcessingSessionId();
  
  try {
    logProcessingStage(session, 'text-extraction', 'started', { fileSize: buffer.byteLength });
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);

    return {
      text: text.trim(),
      wordCount: text.trim().split(/\s+/).length,
      method: 'text',
      warnings: [],
      metadata: {
        fileSize: buffer.byteLength,
        detectedMimeType: 'text/plain',
      },
    };
  } catch (error) {
    throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromDocument(
  file: File | Blob,
  filename?: string
): Promise<ExtractedContent> {
  const sessionId = generateProcessingSessionId();
  
  try {
    documentProcessingLogger.info('Starting document extraction', {
      sessionId,
      fileName: filename || (file as File).name || 'unknown',
      fileSize: file.size,
      fileType: file.type,
    });
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const error: ProcessingError = {
        code: 'FILE_TOO_LARGE',
        message: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`,
      };
      throw error;
    }

    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Detect file type
    const detectedMimeType = detectFileType(buffer, filename || (file as File).name);
    
    documentProcessingLogger.info('File type detected', { 
      sessionId, 
      detectedMimeType, 
      originalType: file.type 
    });
    
    // Route to appropriate extractor
    let result: ExtractedContent;
    switch (detectedMimeType) {
      case 'application/pdf':
        result = await extractFromPDF(buffer, sessionId);
        break;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        result = await extractFromDOCX(buffer, sessionId);
        break;
      
      case 'text/html':
        result = await extractFromHTML(buffer, sessionId);
        break;
      
      case 'text/plain':
        result = await extractFromText(buffer, sessionId);
        break;
      
      default:
        logProcessingError(sessionId, 'format-detection', { 
          code: 'UNSUPPORTED_FORMAT', 
          detectedMimeType 
        });
        const error: ProcessingError = {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format: ${detectedMimeType}. Supported formats: PDF, DOCX, HTML, TXT.`,
        };
        throw error;
    }
    
    // Log successful extraction
    documentProcessingLogger.info('Document extraction completed successfully', {
      sessionId,
      method: result.method,
      wordCount: result.wordCount,
      hasWarnings: result.warnings.length > 0,
      processingTime: Date.now() - parseInt(sessionId.split('_')[1]),
    });
    
    return result;
  } catch (error) {
    // Log the error before re-throwing
    logProcessingError(sessionId, 'document-extraction', error);
    
    if ('code' in (error as any)) {
      throw error; // Re-throw ProcessingError
    }
    
    const processingError: ProcessingError = {
      code: 'EXTRACTION_FAILED',
      message: `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalError: error instanceof Error ? error : undefined,
    };
    throw processingError;
  }
}

export function isProcessingError(error: any): error is ProcessingError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
}