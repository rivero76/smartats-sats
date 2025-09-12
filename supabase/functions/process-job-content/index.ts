import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    console.log('Processing job content with AI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured information from job descriptions. Extract the following information from the job description and return it as valid JSON:

{
  "title": "exact job title/position name",
  "company": "company name",
  "location": {
    "city": "city name",
    "state": "state/province",
    "country": "country"
  },
  "skills": ["skill1", "skill2", "skill3"],
  "employment_type": "full-time|part-time|contract|internship",
  "department": "department name if mentioned",
  "salary_range": "salary range if mentioned",
  "confidence": {
    "title": 0.95,
    "company": 0.90,
    "location": 0.85
  }
}

Return only valid JSON. If information is not available, use null for that field. Confidence should be between 0 and 1.`
          },
          {
            role: 'user',
            content: `Extract information from this job description:\n\n${content}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedInfo = JSON.parse(data.choices[0].message.content);

    console.log('Successfully extracted job information:', extractedInfo);

    return new Response(JSON.stringify(extractedInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing job content:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: {
        title: null,
        company: null,
        location: { city: null, state: null, country: null },
        skills: [],
        employment_type: null,
        department: null,
        salary_range: null,
        confidence: { title: 0, company: 0, location: 0 }
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});