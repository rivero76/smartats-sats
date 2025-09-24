-- Update the stuck analysis record to completed status
UPDATE sats_analyses 
SET 
  status = 'completed',
  ats_score = 65,
  matched_skills = '["AI", "machine learning", "NLP", "AI architecture", "AI lifecycle management", "cloud infrastructure", "automation", "analytical skills", "problem-solving", "communication skills", "client focus", "relationship management"]'::jsonb,
  missing_skills = '["Associate Director", "PricewaterhouseCoopers", "Auckland", "generative AI", "system development lifecycle", "agile", "AI strategies", "tech lead", "AI governance", "compliance", "assurance standards", "responsible AI", "ethical AI", "bias", "fairness", "transparency", "data privacy", "MLOps", "AI thought leadership", "publications", "presentations", "AI trends", "emerging technologies", "regulatory developments", "certifications in AI/ML"]'::jsonb,
  suggestions = 'Ensure the resume file is not corrupted and is readable by ATS systems.
Add specific experience related to ''Associate Director'' roles.
Include experience or projects related to ''generative AI''.
Highlight experience with ''system development lifecycle'' and ''agile methodologies''.
Mention any leadership roles, particularly as a ''tech lead''.
Discuss experience with ''AI governance'', ''compliance'', and ''assurance standards''.
Include any publications or presentations to demonstrate ''AI thought leadership''.
List any relevant ''certifications in AI/ML''.
Ensure the resume is formatted with clear section headers and avoids tables or graphics that ATS might not parse correctly.',
  updated_at = now()
WHERE id = '945c6149-c956-48aa-855e-ecf0dcd41432';