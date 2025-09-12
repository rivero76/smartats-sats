-- Create SATS storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('SATS_resumes', 'SATS_resumes', false),
  ('SATS_job_documents', 'SATS_job_documents', false);

-- Create RLS policies for SATS_resumes bucket
CREATE POLICY "Users can upload their own resume files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own resume files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own resume files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own resume files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create RLS policies for SATS_job_documents bucket
CREATE POLICY "Users can upload their own job document files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own job document files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own job document files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own job document files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );