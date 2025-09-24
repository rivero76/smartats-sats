-- First, clean up orphaned document extractions (resume_id doesn't exist in sats_resumes)
DELETE FROM document_extractions 
WHERE resume_id NOT IN (SELECT id FROM sats_resumes);

-- Then clean up duplicate extractions, keeping only the latest one per resume
DELETE FROM document_extractions 
WHERE id NOT IN (
  SELECT DISTINCT ON (resume_id) id 
  FROM document_extractions 
  ORDER BY resume_id, created_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE document_extractions 
ADD CONSTRAINT document_extractions_resume_id_unique UNIQUE (resume_id);

-- Add foreign key constraint with cascade delete
ALTER TABLE document_extractions 
ADD CONSTRAINT document_extractions_resume_id_fkey 
FOREIGN KEY (resume_id) REFERENCES sats_resumes(id) ON DELETE CASCADE;