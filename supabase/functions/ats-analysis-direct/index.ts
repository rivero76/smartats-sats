import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const resumeContent = await getResumeContent(resume);
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

async function getResumeContent(resume: any): Promise<string> {
  // Try to fetch actual resume content from storage if available
  if (resume.file_url) {
    try {
      console.log('Attempting to fetch resume content from:', resume.file_url);
      const response = await fetch(resume.file_url);
      if (response.ok) {
        const text = await response.text();
        console.log('Retrieved resume content, length:', text.length);
        
        // Clean up the content to remove excessive whitespace and optimize tokens
        const cleanedText = text
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .trim();
          
        console.log('Cleaned resume content, new length:', cleanedText.length);
        return cleanedText;
      }
    } catch (error) {
      console.error('Failed to fetch resume content:', error);
    }
  }
  
  // Fallback - return placeholder for now
  return `Resume content for ${resume.name} (placeholder - actual file extraction would be implemented here)`;
}