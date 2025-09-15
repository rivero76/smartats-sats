import mammoth from 'mammoth';
import * as pdfjsLib from 'pdf-parse';
import JSZip from 'jszip';
import { convert as htmlToText } from 'html-to-text';

export interface ExtractedContent {
  text: string;
  wordCount: number;
  method: 'mammoth' | 'pdf-parse' | 'html-to-text' | 'text' | 'docx-fallback';
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

async function extractFromPDF(buffer: ArrayBuffer): Promise<ExtractedContent> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const pdfData = await pdfjsLib(uint8Array);
    
    const warnings: string[] = [];
    
    // Check if PDF might be scanned (low text-to-page ratio)
    const avgTextPerPage = pdfData.text.length / pdfData.numpages;
    if (avgTextPerPage < 50) {
      warnings.push('This PDF may contain scanned images. Consider using OCR for better text extraction.');
    }

    return {
      text: pdfData.text.trim(),
      wordCount: pdfData.text.trim().split(/\s+/).length,
      method: 'pdf-parse',
      warnings,
      metadata: {
        pages: pdfData.numpages,
        fileSize: buffer.byteLength,
        detectedMimeType: 'application/pdf',
      },
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractFromDOCX(buffer: ArrayBuffer): Promise<ExtractedContent> {
  try {
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
    // Fallback to manual DOCX parsing
    try {
      return await extractFromDOCXFallback(buffer);
    } catch (fallbackError) {
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function extractFromDOCXFallback(buffer: ArrayBuffer): Promise<ExtractedContent> {
  try {
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

async function extractFromHTML(buffer: ArrayBuffer): Promise<ExtractedContent> {
  try {
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

async function extractFromText(buffer: ArrayBuffer): Promise<ExtractedContent> {
  try {
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
  try {
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
    
    // Route to appropriate extractor
    switch (detectedMimeType) {
      case 'application/pdf':
        return await extractFromPDF(buffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractFromDOCX(buffer);
      
      case 'text/html':
        return await extractFromHTML(buffer);
      
      case 'text/plain':
        return await extractFromText(buffer);
      
      default:
        const error: ProcessingError = {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format: ${detectedMimeType}. Supported formats: PDF, DOCX, HTML, TXT.`,
        };
        throw error;
    }
  } catch (error) {
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