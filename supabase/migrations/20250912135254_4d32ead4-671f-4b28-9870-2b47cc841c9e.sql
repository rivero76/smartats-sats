-- Create SATS storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('SATS_resumes', 'SATS_resumes', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('SATS_job_documents', 'SATS_job_documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('SATS_ats_artifacts', 'SATS_ats_artifacts', false);

-- Create RLS policies for SATS_resumes bucket
CREATE POLICY "Users can view their own resumes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own resumes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for SATS_job_documents bucket
CREATE POLICY "Users can view their own job documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own job documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own job documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own job documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_job_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for SATS_ats_artifacts bucket
CREATE POLICY "Users can view their own ATS artifacts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own ATS artifacts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own ATS artifacts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own ATS artifacts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'SATS_ats_artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);