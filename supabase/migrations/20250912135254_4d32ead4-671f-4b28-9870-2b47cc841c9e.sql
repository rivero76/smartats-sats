-- Create SATS storage buckets
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name) VALUES ('SATS_resumes', 'SATS_resumes')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO storage.buckets (id, name) VALUES ('SATS_job_documents', 'SATS_job_documents')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO storage.buckets (id, name) VALUES ('SATS_ats_artifacts', 'SATS_ats_artifacts')
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'public'
  ) THEN
    EXECUTE 'UPDATE storage.buckets SET public = false WHERE id IN (''SATS_resumes'', ''SATS_job_documents'', ''SATS_ats_artifacts'')';
  END IF;
END;
$$;

-- Create RLS policies for SATS_resumes bucket
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
CREATE POLICY "Users can view their own resumes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
CREATE POLICY "Users can upload their own resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own resumes" ON storage.objects;
CREATE POLICY "Users can update their own resumes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;
CREATE POLICY "Users can delete their own resumes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for SATS_job_documents bucket
DROP POLICY IF EXISTS "Users can view their own job documents" ON storage.objects;
CREATE POLICY "Users can view their own job documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own job documents" ON storage.objects;
CREATE POLICY "Users can upload their own job documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own job documents" ON storage.objects;
CREATE POLICY "Users can update their own job documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own job documents" ON storage.objects;
CREATE POLICY "Users can delete their own job documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for SATS_ats_artifacts bucket
DROP POLICY IF EXISTS "Users can view their own ATS artifacts" ON storage.objects;
CREATE POLICY "Users can view their own ATS artifacts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own ATS artifacts" ON storage.objects;
CREATE POLICY "Users can upload their own ATS artifacts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own ATS artifacts" ON storage.objects;
CREATE POLICY "Users can update their own ATS artifacts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own ATS artifacts" ON storage.objects;
CREATE POLICY "Users can delete their own ATS artifacts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);
