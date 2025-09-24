import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ATSAnalysisRequest {
  analysis_id: string
  resume_id: string
  jd_id: string
}

interface ATSAnalysisResult {
  match_score: number
  keywords_found: string[]
  keywords_missing: string[]
  resume_warnings: string[]
  recommendations: string[]
}

serve(async (req) => {
  // Add version logging for deployment tracking
  const FUNCTION_VERSION = '2.1.0-2024-09-24';
  console.log(`ATS Analysis Direct Function v${FUNCTION_VERSION} - Request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body once to avoid "Body already consumed" error
  let requestBody: ATSAnalysisRequest;
  try {
    requestBody = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Invalid request body' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { analysis_id, resume_id, jd_id } = requestBody;
    console.log(`Starting ATS analysis: ${analysis_id} for resume ${resume_id} vs job ${jd_id}`);

    // Fetch resume and job description data
    const [resumeResult, jobResult] = await Promise.all([
      supabase
        .from('sats_resumes')
        .select('*')
        .eq('id', resume_id)
        .single(),
      supabase
        .from('sats_job_descriptions')
        .select(`
          *,
          company:sats_companies!sats_job_descriptions_company_id_fkey (*),
          location:sats_locations!sats_job_descriptions_location_id_fkey (*)
        `)
        .eq('id', jd_id)
        .single()
    ]);

    if (resumeResult.error || jobResult.error) {
      console.error('Error fetching data:', resumeResult.error || jobResult.error);
      throw new Error('Failed to fetch resume or job description data');
    }

    const resume = resumeResult.data;
    const jobDescription = jobResult.data;

    // Update analysis status to processing
    await supabase
      .from('sats_analyses')
      .update({ 
        status: 'processing',
        analysis_data: { processing_started_at: new Date().toISOString() }
      })
      .eq('id', analysis_id);

    // Get and optimize content
    const resumeContent = await getResumeContent(resume, supabase);
    const jobContent = jobDescription.pasted_text || '';
    
    // Build optimized prompt
    const prompt = buildATSPrompt(
      jobDescription.name,
      jobContent,
      resume.name,
      resumeContent
    );

    console.log('Calling OpenAI API with prompt length:', prompt.length);
    
    // Call OpenAI API with gpt-4o-mini for better token efficiency
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are an ATS scoring engine. Output STRICT JSON only (no code fences).'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      // Handle specific rate limit errors
      if (response.status === 429 && errorText.includes('rate_limit_exceeded')) {
        throw new Error('Request too large. Please try with a shorter resume or job description.');
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();
    
    console.log('Raw OpenAI response:', rawContent);
    console.log('Token usage:', data.usage);

    // Parse JSON with graceful fallbacks (from local solution)
    const analysisResult = parseATSResponse(rawContent);

    // Store results in database
    const updateData = {
      status: 'completed',
      ats_score: Math.round(analysisResult.match_score * 100),
      matched_skills: analysisResult.keywords_found,
      missing_skills: analysisResult.keywords_missing,
      suggestions: analysisResult.recommendations.join('\n'),
      analysis_data: {
        processing_completed_at: new Date().toISOString(),
        processing_time_ms: latencyMs,
        token_usage: data.usage,
        model_used: 'gpt-4o-mini',
        resume_warnings: analysisResult.resume_warnings,
        raw_llm_response: {
          content: rawContent,
          parsed_result: analysisResult
        }
      }
    };

    console.log('Updating database with:', JSON.stringify(updateData, null, 2));

    const { data: updateResult, error: updateError } = await supabase
      .from('sats_analyses')
      .update(updateData)
      .eq('id', analysis_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update analysis: ${updateError.message}`);
    }

    console.log('Database update successful:', updateResult?.status, updateResult?.ats_score);

    console.log(`Analysis completed successfully: ${analysis_id}, score: ${updateData.ats_score}%`);

    // Force a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    return new Response(JSON.stringify({ 
      success: true, 
      analysis_id,
      ats_score: updateData.ats_score,
      matched_skills: analysisResult.keywords_found,
      missing_skills: analysisResult.keywords_missing,
      processing_time_ms: latencyMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ATS analysis function:', error);
    
    // Try to update analysis status to error using the already parsed request body
    try {
      if (requestBody?.analysis_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('sats_analyses')
          .update({
            status: 'error',
            analysis_data: {
              error_message: error.message,
              error_timestamp: new Date().toISOString()
            }
          })
          .eq('id', requestBody.analysis_id);
      }
    } catch (updateError) {
      console.error('Failed to update analysis error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildATSPrompt(jdTitle: string, jdText: string, resumeTitle: string, resumeText: string): string {
  // Truncate content if too long to avoid token limits
  const maxJobLength = 15000; // ~3750 tokens
  const maxResumeLength = 25000; // ~6250 tokens
  
  const truncatedJobText = jdText.length > maxJobLength 
    ? jdText.substring(0, maxJobLength) + '...[truncated]'
    : jdText;
    
  const truncatedResumeText = resumeText.length > maxResumeLength
    ? resumeText.substring(0, maxResumeLength) + '...[truncated]'
    : resumeText;

  return `Role: ATS simulator. Compare resume vs job description.

Output STRICT JSON (no fences):
{
  "match_score": 0.0,
  "keywords_found": ["..."],
  "keywords_missing": ["..."],
  "resume_warnings": ["..."],
  "recommendations": ["..."]
}

Job: ${jdTitle}
${truncatedJobText}

Resume: ${resumeTitle}  
${truncatedResumeText}`.trim();
}

function parseATSResponse(rawResponse: string): ATSAnalysisResult {
  let text = rawResponse.trim();
  
  // Remove fences if present (graceful fallback)
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }
  
  try {
    const data = JSON.parse(text);
    
    if (typeof data !== 'object' || data === null) {
      throw new Error('Response must be a JSON object');
    }

    return {
      match_score: clampScore(data.match_score),
      keywords_found: coerceToStringArray(data.keywords_found),
      keywords_missing: coerceToStringArray(data.keywords_missing),
      resume_warnings: coerceToStringArray(data.resume_warnings),
      recommendations: coerceToStringArray(data.recommendations)
    };
  } catch (error) {
    console.error('Failed to parse ATS response:', error);
    console.error('Raw response was:', rawResponse);
    
    // Return default response on parse failure
    return {
      match_score: 0.0,
      keywords_found: [],
      keywords_missing: [],
      resume_warnings: ['Failed to parse analysis response'],
      recommendations: ['Please retry the analysis']
    };
  }
}

function clampScore(value: any): number {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return 0.0;
    return Math.max(0.0, Math.min(1.0, num));
  } catch {
    return 0.0;
  }
}

function coerceToStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

async function getResumeContent(resume: any, supabase: any): Promise<string> {
  console.log(`Checking for pre-extracted text for resume ${resume.id}`);
  
  // First, check if we already have extracted text in document_extractions table
  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('extracted_text, warnings, word_count, extraction_method')
    .eq('resume_id', resume.id)
    .order('created_at', { ascending: false })
    .maybeSingle();

  console.log('Document extraction query result:', { 
    found: !extractionError, 
    textLength: extraction?.extracted_text?.length || 0,
    wordCount: extraction?.word_count || 0,
    method: extraction?.extraction_method || 'none',
    error: extractionError?.message || 'none'
  });

  if (!extractionError && extraction?.extracted_text && extraction.extracted_text.trim().length > 0) {
    console.log('✓ Using pre-extracted text, length:', extraction.extracted_text.length, 'words:', extraction.word_count);
    return extraction.extracted_text;
  }

  // No pre-extracted text found, extract from file
  if (resume.file_url) {
    try {
      console.log('Attempting to fetch resume content from:', resume.file_url);
      const response = await fetch(resume.file_url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log('Retrieved resume content, length:', buffer.byteLength);
        
        // Extract text based on file type
        const extractedText = await extractTextFromBuffer(buffer, resume.name);
        
        // Store the extracted text for future use
        try {
          await supabase
            .from('document_extractions')
            .upsert({
              resume_id: resume.id,
              extracted_text: extractedText,
              extraction_method: 'edge-function',
              word_count: extractedText.split(/\s+/).filter(w => w.length > 0).length,
              warnings: []
            });
        } catch (storeError) {
          console.warn('Failed to store extracted text:', storeError);
        }
        
        return extractedText;
      }
    } catch (error) {
      console.error('Failed to fetch resume content:', error);
      
      // Enhanced error logging
      console.error('Resume details:', {
        id: resume.id,
        name: resume.name,
        file_url: resume.file_url,
        user_id: resume.user_id
      });
      
      // If we can't extract, check one more time for any pre-extracted content
      const { data: fallbackExtraction } = await supabase
        .from('document_extractions')
        .select('extracted_text')
        .eq('resume_id', resume.id)
        .order('created_at', { ascending: false })
        .maybeSingle();
        
      if (fallbackExtraction?.extracted_text) {
        console.log('✓ Using fallback pre-extracted text');
        return fallbackExtraction.extracted_text;
      }
      
      const errorMessage = `Resume content is unreadable or corrupted. Error: ${error.message}`;
      console.error('Returning error message:', errorMessage);
      return errorMessage;
  }
  
  return `Resume content for ${resume.name} could not be accessed.`;
}

async function extractTextFromBuffer(buffer: ArrayBuffer, filename: string): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  
  console.log(`Extracting text from file: ${filename}, detected extension: ${fileExtension}, buffer size: ${buffer.byteLength}`);
  
  try {
    // Enhanced file type detection - check magic bytes for better identification
    const magicBytes = uint8Array.slice(0, 8);
    const magicHex = Array.from(magicBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`File magic bytes: ${magicHex}`);
    
    // Detect file type by magic bytes first, then fall back to extension
    let detectedType = fileExtension;
    
    // DOCX files start with PK (ZIP format)
    if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) {
      console.log('Detected ZIP/DOCX format from magic bytes');
      detectedType = 'docx';
    }
    // PDF files start with %PDF
    else if (magicBytes[0] === 0x25 && magicBytes[1] === 0x50 && magicBytes[2] === 0x44 && magicBytes[3] === 0x46) {
      console.log('Detected PDF format from magic bytes');
      detectedType = 'pdf';
    }
    // Check if it might be plain text
    else {
      const sample = uint8Array.slice(0, Math.min(1024, uint8Array.length));
      const textableBytes = sample.filter(byte => 
        (byte >= 32 && byte <= 126) || // Printable ASCII
        byte === 9 || byte === 10 || byte === 13 || // Tab, LF, CR
        byte === 32 // Space
      );
      
      if (textableBytes.length / sample.length > 0.8) {
        console.log('Detected text format from content analysis');
        detectedType = 'txt';
      }
    }
    
    console.log(`Final detected type: ${detectedType}`);
    
    switch (detectedType) {
      case 'docx':
        return await extractFromDOCX(buffer);
      case 'pdf':
        return await extractFromPDF(buffer);
      case 'txt':
        return new TextDecoder('utf-8').decode(buffer);
      case 'html':
      case 'htm':
        return await extractFromHTML(buffer);
      default:
        // Enhanced fallback - try different extraction methods
        console.log('Unknown file type, attempting fallback extractions...');
        
        // Try DOCX first (most common resume format)
        try {
          console.log('Attempting DOCX extraction as fallback...');
          const docxResult = await extractFromDOCX(buffer);
          console.log('✓ DOCX fallback extraction successful');
          return docxResult;
        } catch (docxError) {
          console.log('DOCX fallback failed:', docxError.message);
        }
        
        // Try PDF
        try {
          console.log('Attempting PDF extraction as fallback...');
          const pdfResult = await extractFromPDF(buffer);
          console.log('✓ PDF fallback extraction successful');
          return pdfResult;
        } catch (pdfError) {
          console.log('PDF fallback failed:', pdfError.message);
        }
        
        // Try plain text
        try {
          console.log('Attempting text extraction as fallback...');
          const textResult = new TextDecoder('utf-8').decode(buffer);
          if (textResult.trim().length > 10) {
            console.log('✓ Text fallback extraction successful');
            return textResult;
          }
        } catch (textError) {
          console.log('Text fallback failed:', textError.message);
        }
        
        throw new Error(`Unsupported file format: ${filename}. Tried DOCX, PDF, and text extraction.`);
    }
  } catch (error) {
    console.error('Text extraction failed:', error);
    throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
  }
}

async function extractFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting DOCX extraction...');
    // Import JSZip dynamically for Deno
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    
    const zip = await JSZip.loadAsync(buffer);
    console.log('ZIP loaded successfully, files:', Object.keys(zip.files));
    
    const documentXml = await zip.file('word/document.xml')?.async('text');
    
    if (!documentXml) {
      // List available files for debugging
      const availableFiles = Object.keys(zip.files);
      console.log('Available files in ZIP:', availableFiles);
      throw new Error(`Invalid DOCX file structure - no document.xml found. Available files: ${availableFiles.join(', ')}`);
    }

    console.log('document.xml found, length:', documentXml.length);

    // Enhanced XML parsing - handle more text elements
    const textElements = [
      /<w:t[^>]*>([^<]*)<\/w:t>/g,  // Standard text elements
      /<w:t>([^<]*)<\/w:t>/g,        // Simple text elements
      /<w:instrText[^>]*>([^<]*)<\/w:instrText>/g  // Instruction text
    ];
    
    let allText: string[] = [];
    
    for (const regex of textElements) {
      let match;
      while ((match = regex.exec(documentXml)) !== null) {
        if (match[1] && match[1].trim()) {
          allText.push(match[1].trim());
        }
      }
    }
    
    console.log('Extracted text elements:', allText.length);
    
    if (allText.length === 0) {
      // Fallback: try to extract any text between > and <
      const fallbackMatches = documentXml.match(/>([^<]+)</g);
      if (fallbackMatches) {
        allText = fallbackMatches
          .map(match => match.substring(1, match.length - 1).trim())
          .filter(text => text.length > 0 && !text.startsWith('xml') && !text.startsWith('w:'));
        console.log('Fallback extraction found:', allText.length, 'text elements');
      }
    }
    
    const extractedText = allText.join(' ').trim();

    if (!extractedText) {
      throw new Error('DOCX file appears to be empty or corrupted - no readable text found');
    }

    console.log('✓ DOCX extraction successful, text length:', extractedText.length);
    return extractedText;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

async function extractFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    // Import pdf-parse for Deno - a lightweight PDF parser
    const pdfParse = (await import('https://esm.sh/pdf-parse@1.1.1')).default;
    
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF file appears to be empty or contains only images');
    }
    
    return data.text.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

async function extractFromHTML(buffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8');
    const htmlContent = decoder.decode(buffer);
    
    // Parse HTML and extract text content
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const textContent = doc.body?.textContent || doc.documentElement?.textContent || '';
    
    if (!textContent.trim()) {
      throw new Error('HTML file appears to be empty');
    }
    
    return textContent.trim();
  } catch (error) {
    console.error('HTML extraction error:', error);
    throw new Error(`HTML extraction failed: ${error.message}`);
  }
}