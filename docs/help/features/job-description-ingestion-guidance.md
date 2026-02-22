# Job Description Ingestion Guidance

## Purpose
This guide explains the supported ingestion methods in Smart ATS and how users should handle blocked job pages.

## Supported Methods
1. Paste Text (`Recommended`)
- Best option for login-protected job pages and copied postings from LinkedIn or similar platforms.
- Copy the full role details, requirements, and qualifications before saving.

2. Use URL (Single Page Fetch)
- Use a direct, publicly accessible job post URL.
- Smart ATS performs a single-page fetch only.
- No crawler behavior and no recursive scraping.

3. Upload File (PDF/DOC/DOCX)
- Use exported job descriptions from recruiters or ATS exports.
- Best when text formatting needs to be preserved from documents.

## Important Limitations
- Some sites block automated fetch requests for login-gated or anti-bot protected pages.
- A URL may fail even if it opens in your browser session.
- Smart ATS does not require or store third-party website credentials.

## Recommended User Procedure
1. Start with `Paste Text` for fastest and most reliable ingestion.
2. Use `URL` only when the job post is public and directly accessible.
3. If URL ingestion fails, switch to `Paste Text` or `Upload File`.
4. Review auto-extracted fields (title, company, location, skills) before saving.

## Error Guidance For End Users
- `URL ingestion failed` or `Unable to fetch URL content (403/404)`:
  Use `Paste Text` or `Upload File`.
- `Origin not allowed`:
  Contact admin to allow your app domain in environment settings.
- Empty or poor extraction:
  Paste full plain text description and re-save.

## Responsible Use
- Only ingest content that your organization is authorized to process.
- Do not share third-party account credentials in Smart ATS.
