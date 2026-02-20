-- Create SATS storage buckets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'public'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES
      ('SATS_resumes', 'SATS_resumes', false),
      ('SATS_job_documents', 'SATS_job_documents', false)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO storage.buckets (id, name) VALUES
      ('SATS_resumes', 'SATS_resumes'),
      ('SATS_job_documents', 'SATS_job_documents')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

-- Create RLS policies for SATS_resumes bucket
DROP POLICY IF EXISTS "Users can upload their own resume files" ON storage.objects;
CREATE POLICY "Users can upload their own resume files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their own resume files" ON storage.objects;
CREATE POLICY "Users can view their own resume files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own resume files" ON storage.objects;
CREATE POLICY "Users can update their own resume files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own resume files" ON storage.objects;
CREATE POLICY "Users can delete their own resume files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'SATS_resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create RLS policies for SATS_job_documents bucket
DROP POLICY IF EXISTS "Users can upload their own job document files" ON storage.objects;
CREATE POLICY "Users can upload their own job document files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their own job document files" ON storage.objects;
CREATE POLICY "Users can view their own job document files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own job document files" ON storage.objects;
CREATE POLICY "Users can update their own job document files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own job document files" ON storage.objects;
CREATE POLICY "Users can delete their own job document files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'SATS_job_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
