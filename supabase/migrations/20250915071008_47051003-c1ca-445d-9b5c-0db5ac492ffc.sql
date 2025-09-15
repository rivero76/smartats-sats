-- Create document_extractions table to store extracted text content
CREATE TABLE public.document_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id UUID NOT NULL,
  extracted_text TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  extraction_method TEXT NOT NULL,
  warnings JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view extractions for their own resumes" 
ON public.document_extractions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sats_resumes r 
  WHERE r.id = document_extractions.resume_id 
  AND r.user_id = auth.uid()
));

CREATE POLICY "Users can create extractions for their own resumes" 
ON public.document_extractions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM sats_resumes r 
  WHERE r.id = document_extractions.resume_id 
  AND r.user_id = auth.uid()
));

CREATE POLICY "Users can update extractions for their own resumes" 
ON public.document_extractions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM sats_resumes r 
  WHERE r.id = document_extractions.resume_id 
  AND r.user_id = auth.uid()
));

CREATE POLICY "Users can delete extractions for their own resumes" 
ON public.document_extractions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM sats_resumes r 
  WHERE r.id = document_extractions.resume_id 
  AND r.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_document_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_extractions_updated_at();