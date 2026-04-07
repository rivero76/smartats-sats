/**
 * UPDATE LOG
 * 2026-04-07 20:00:00 | Updated atsAnalysis (collapsed cards, filter bar), profileSettings (Your Plan section), adminLogging (Debug Modal plan gating).
 * 2026-04-07 12:00:00 | P28 — Added profileFitAnalyzer help topic for the new /profile-fit page (Pro+ gated, RUNTIME-VERIFIED 2026-04-07). Added emailJobAlerts help topic for the Settings Email Job Alerts card (ADR-0007, RUNTIME-VERIFIED 2026-04-05). Updated adminLogging to cover Feature Flags and Plan Overrides admin tabs (shipped 2026-04-07).
 * 2026-04-06 00:00:00 | P26 — Added gapAnalysis help topic for the new /gap Gap Analysis page (Pro+ gated).
 * 2026-03-18 00:00:00 | CR3-1–CR3-4: Added linkedinProfileImport, resumePersonas, adminLogging, accountDeletion topics.
 * 2026-03-30 10:00:00 | P25 S6 — Added skillProfile help topic.
 * 2026-03-30 12:00:00 | PROD-9–PROD-12 — Added resumeIntelligence topic; updated atsAnalysis with intelligence panel steps and features.
 */

export interface HelpStep {
  step: number
  title: string
  description: string
  tip?: string
}

export interface TroubleshootingItem {
  problem: string
  solution: string
}

export interface HelpContent {
  id: string
  title: string
  description: string
  overview: string
  keyFeatures?: string[]
  steps: HelpStep[]
  bestPractices?: string[]
  troubleshooting?: TroubleshootingItem[]
  relatedTopics?: string[]
}

export const helpContentData: Record<string, HelpContent> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Learn how to navigate and use your Smart ATS dashboard effectively.',
    overview:
      'Your dashboard provides a centralized view of all your recruitment activities, including resumes, job descriptions, and analysis results. Use it to quickly access key features and monitor your progress.',
    keyFeatures: [
      'View summary statistics of your activities',
      'Quick access to main features',
      'Recent activity tracking',
      'System status and feature availability',
    ],
    steps: [
      {
        step: 1,
        title: 'Review Your Statistics',
        description:
          'Check the statistics cards at the top to see your total resumes, job descriptions, analyses, and average match rate.',
        tip: 'Higher match rates indicate better resume-job compatibility. Aim for 80%+ scores for optimal ATS performance.',
      },
      {
        step: 2,
        title: 'Use Quick Actions',
        description:
          'Click on any Quick Action button to jump directly to that feature - Manage Resumes, Job Descriptions, or ATS Analysis.',
        tip: "Start with uploading a resume if you're new, then create job descriptions for analysis.",
      },
      {
        step: 3,
        title: 'Monitor Recent Activity',
        description:
          'Check the Recent Activity panel to see your latest analyses and system updates.',
        tip: 'Completed analyses show scores and matched skills - review these to improve future applications.',
      },
    ],
    bestPractices: [
      'Check your dashboard regularly to monitor progress and identify areas for improvement',
      'Use the quick action buttons for efficient navigation to frequently used features',
      'Pay attention to your average match rate trend over time to measure improvement',
      'Review recent activity to stay informed about completed analyses and system updates',
    ],
    troubleshooting: [
      {
        problem: 'Statistics showing zero values',
        solution:
          'This is normal for new accounts. Upload your first resume or create a job description to see data.',
      },
      {
        problem: 'Quick action buttons not working',
        solution:
          "Ensure you're logged in and try refreshing the page. Contact support if the issue persists.",
      },
    ],
    relatedTopics: ['Resume Management', 'Job Descriptions', 'ATS Analysis', 'Profile Settings'],
  },

  resumes: {
    id: 'resumes',
    title: 'Resume Management',
    description: 'Learn how to upload, manage, and optimize your resumes for ATS compatibility.',
    overview:
      'The Resume Management section allows you to upload, store, and organize multiple versions of your resume. You can upload files or paste text directly, making it easy to maintain different resumes for different job applications.',
    keyFeatures: [
      'Upload PDF, DOC, or DOCX files',
      'Paste resume text directly',
      'Edit and update existing resumes',
      'Download original files',
      'Delete outdated resumes',
    ],
    steps: [
      {
        step: 1,
        title: 'Upload Your Resume',
        description:
          "Click 'Upload Resume' button and either upload a file (PDF, DOC, DOCX) or paste your resume text directly.",
        tip: 'For best results, use well-formatted PDFs or Word documents. Plain text works but may lose formatting.',
      },
      {
        step: 2,
        title: 'Add Resume Details',
        description:
          "Provide a descriptive name for your resume to help you identify it later (e.g., 'Software Engineer Resume v2').",
        tip: 'Use clear, descriptive names especially if you maintain multiple resume versions for different roles.',
      },
      {
        step: 3,
        title: 'Review and Save',
        description:
          'Review the extracted content to ensure accuracy, then save your resume to the system.',
        tip: 'Check that key skills, experience, and contact information were extracted correctly.',
      },
      {
        step: 4,
        title: 'Manage Your Resumes',
        description:
          'View all uploaded resumes in the table, edit details, download files, or delete outdated versions.',
        tip: 'Keep your resume collection organized by regularly updating and removing outdated versions.',
      },
    ],
    bestPractices: [
      'Use clear, professional formatting in your original resume files for better text extraction',
      'Maintain multiple targeted versions for different job types or industries',
      'Include relevant keywords naturally throughout your resume content',
      'Keep file sizes reasonable (under 10MB) for faster processing',
      'Use descriptive names to easily distinguish between different resume versions',
    ],
    troubleshooting: [
      {
        problem: 'File upload fails or times out',
        solution:
          'Check your internet connection and try again. Ensure file size is under 10MB and format is PDF, DOC, or DOCX.',
      },
      {
        problem: 'Text extraction looks incorrect',
        solution:
          'This can happen with complex formatting. Try uploading a simpler formatted version or paste the text directly.',
      },
      {
        problem: 'Cannot download resume file',
        solution:
          'Ensure you have permission to download files and your browser allows downloads from this site.',
      },
    ],
    relatedTopics: ['ATS Analysis', 'Job Descriptions', 'Profile Settings'],
  },

  jobDescriptions: {
    id: 'jobDescriptions',
    title: 'Job Description Management',
    description:
      'Learn how to create, manage, and optimize job descriptions for effective resume matching.',
    overview:
      'Job descriptions are essential for ATS analysis as they define the requirements and keywords that resumes are matched against. For ingestion, prefer Paste Text first, then use URL only for public pages, or upload PDF/DOC files when available.',
    keyFeatures: [
      'Upload job posting files',
      'Paste job description text',
      'Ingest from single public URL',
      'Add company information',
      'Set location details',
      'Search and filter descriptions',
      'Edit and update existing descriptions',
    ],
    steps: [
      {
        step: 1,
        title: 'Create Job Description',
        description:
          "Click 'Create Job Description' and provide a clear title that describes the role (e.g., 'Senior Software Engineer - Frontend').",
        tip: 'Use specific, descriptive titles that clearly indicate the role level and specialization.',
      },
      {
        step: 2,
        title: 'Add Company Information',
        description:
          'Enter the company name and other relevant details to provide context for the position.',
        tip: 'Company information helps contextualize the role and can affect how skills are weighted in analysis.',
      },
      {
        step: 3,
        title: 'Set Location Details',
        description:
          'Add location information including city, state/province, and country if relevant to the position.',
        tip: 'Location can be important for remote work preferences and regional skill requirements.',
      },
      {
        step: 4,
        title: 'Choose Ingestion Method',
        description:
          'Use Paste Text for login-protected sites, Use URL for direct public pages, or Upload File for PDF/DOC exports.',
        tip: 'If URL ingestion fails, switch to Paste Text or Upload File immediately.',
      },
      {
        step: 5,
        title: 'Add Full Job Content',
        description:
          'Ensure the content includes role summary, responsibilities, required skills, preferred qualifications, and experience requirements.',
        tip: 'Include both required and preferred qualifications for more comprehensive matching analysis.',
      },
      {
        step: 6,
        title: 'Review and Save',
        description:
          'Review all information for accuracy and completeness before saving the job description.',
        tip: 'Well-detailed job descriptions lead to more accurate ATS analysis results.',
      },
    ],
    bestPractices: [
      'Include comprehensive skill requirements, both technical and soft skills',
      'Specify experience levels clearly (junior, mid-level, senior)',
      'List both required and preferred qualifications',
      'Use industry-standard terminology and keywords',
      'Keep job descriptions updated with current requirements',
      'Use URL ingestion only for publicly accessible pages (single page fetch)',
      'Do not enter third-party credentials in Smart ATS',
      'Use the search function to find existing descriptions before creating duplicates',
    ],
    troubleshooting: [
      {
        problem: 'Job description text appears corrupted after upload',
        solution:
          'Try copying and pasting the text directly instead of uploading a file, or use a simpler text format.',
      },
      {
        problem: 'URL ingestion failed with 403/404 or blocked access',
        solution:
          'The source website likely blocked automated fetch. Use Paste Text or Upload File as fallback.',
      },
      {
        problem: 'URL works in browser but fails in Smart ATS',
        solution:
          'Some sites require browser session state or anti-bot checks. Paste the job text manually for reliable ingestion.',
      },
      {
        problem: 'Search function not finding my job descriptions',
        solution:
          'Check your search terms and try searching by company name or partial job titles.',
      },
      {
        problem: 'Cannot edit or delete job descriptions',
        solution: "Ensure you're the owner of the job description and try refreshing the page.",
      },
    ],
    relatedTopics: ['Resume Management', 'ATS Analysis', 'Dashboard Overview'],
  },

  atsAnalysis: {
    id: 'atsAnalysis',
    title: 'ATS Analysis',
    description:
      'Understand how to run ATS analyses, interpret results, and improve your resume compatibility scores.',
    overview:
      'ATS Analysis compares your resume against job descriptions to calculate compatibility scores, identify matched and missing skills, and provide improvement suggestions. This helps optimize your resume for specific positions.',
    keyFeatures: [
      'Resume-job compatibility scoring',
      'Matched skills identification',
      'Missing skills detection',
      'AI-powered improvement suggestions',
      'Progress tracking for ongoing analyses',
      'Detailed results interpretation',
      'Format Audit — detects ATS-breaking resume patterns',
      'Geography Mode — country-specific format checklist for 8 markets',
      'Industry Lens — vertical classification with missing-section detection',
      'Cultural Tone Advisor — detects register mismatches for target market',
      'Collapsed card list: score hero, signal badges (matched/missing), and date visible without expanding',
      'Filter bar: All / Strong Match (80%+) / Needs Work (<60%) / In Progress',
    ],
    steps: [
      {
        step: 1,
        title: 'Start New Analysis',
        description:
          "Click 'New Analysis' and select both a resume and job description from your uploaded content.",
        tip: "Choose the most relevant resume version for the specific job you're targeting.",
      },
      {
        step: 2,
        title: 'Monitor Analysis Progress',
        description:
          'Watch the progress indicator as the system processes your resume and job description for compatibility.',
        tip: 'Analysis typically takes 30-60 seconds. You can continue using other features while it processes.',
      },
      {
        step: 3,
        title: 'Review Your Score',
        description:
          'Once complete, review your ATS compatibility score (0-100%). Scores above 80% indicate strong matches.',
        tip: "Don't worry if your first score is low - use the insights to improve and re-analyze with updated resumes.",
      },
      {
        step: 4,
        title: 'Analyze Matched Skills',
        description:
          'Review the green-highlighted matched skills to see what strengths were identified in your resume.',
        tip: "Matched skills show what's working well - consider emphasizing these areas in interviews.",
      },
      {
        step: 5,
        title: 'Address Missing Skills',
        description:
          'Examine red-highlighted missing skills to identify areas for resume improvement or skill development.',
        tip: 'Focus on the most important missing skills first - those that appear multiple times in the job description.',
      },
      {
        step: 6,
        title: 'Apply AI Suggestions',
        description:
          'Read and implement the AI-generated suggestions to improve your resume for better compatibility.',
        tip: 'Suggestions often include specific wording changes and skills to emphasize more prominently.',
      },
      {
        step: 7,
        title: 'Review Resume Intelligence Panels',
        description:
          'After the CV Optimisation panel, four Resume Intelligence sub-sections appear: Format Audit flags patterns that silently disqualify your résumé; Geography Mode gives country-specific format guidance; Industry Lens identifies missing sections for your target vertical; and Cultural Tone Advisor catches tone mismatches.',
        tip: 'Select your target country using the "Target Market" dropdown when starting an analysis to get the most accurate Geography Mode guidance.',
      },
    ],
    bestPractices: [
      'Run analyses for every job application to optimize your resume for each position',
      'Use multiple resume versions tailored to different job types or industries',
      'Focus on improving scores incrementally rather than trying to address everything at once',
      'Pay attention to both hard skills (technical) and soft skills (communication, leadership) in results',
      'Re-run analyses after making resume updates to track improvement',
      'Use the debug feature if you encounter issues or unexpected results',
      'Use the filter bar to focus on analyses that need attention, rather than scrolling the full list',
      'Debug and Export buttons are in the expanded card — click any card to reveal them',
    ],
    troubleshooting: [
      {
        problem: "Analysis stuck in 'Processing' status",
        solution:
          'Wait up to 2 minutes for processing to complete. If still stuck, use the retry button or contact support.',
      },
      {
        problem: 'Score seems too low despite good qualifications',
        solution:
          'Check if your resume uses different terminology than the job description. Try incorporating exact keywords from the posting.',
      },
      {
        problem: 'Missing skills include things I have experience with',
        solution:
          'Ensure these skills are explicitly mentioned in your resume text. ATS systems look for exact keyword matches.',
      },
      {
        problem: 'Analysis shows error status',
        solution:
          'Use the retry button to reprocess the analysis. If errors persist, check that your resume and job description contain sufficient text content.',
      },
      {
        problem: "I can't find the Debug or Export buttons",
        solution:
          'These buttons are in the expanded state. Click the analysis card to expand it, then look for Debug and Export in the action row at the top of the expanded section.',
      },
    ],
    relatedTopics: [
      'Resume Management',
      'Job Descriptions',
      'Dashboard Overview',
      'Resume Intelligence',
    ],
  },

  resumeIntelligence: {
    id: 'resumeIntelligence',
    title: 'Resume Intelligence',
    description:
      'Four AI-powered analysis panels that diagnose the hidden resume issues that cause silent ATS rejection.',
    overview:
      'Resume Intelligence runs in parallel with your ATS score and surfaces four categories of insights: formatting problems that break ATS parsers, country-specific format requirements, missing sections expected by your target industry, and cultural tone mismatches. Every panel is null-safe — analyses run before this feature shipped show a graceful "not available" state.',
    keyFeatures: [
      'Format Audit — detects ATS-breaking patterns (tables, emojis, vague bullets, missing URL, length mismatch) with critical/warning/info severity',
      'Geography Mode — user selects from 8 target markets or uses auto-detect; produces per-country format checklist for photo, length, personal details, and date format',
      'Industry Lens — classifies the job description by vertical (Tech, Finance, Healthcare, Legal, Creative, Academic, Startup, Operations) and flags missing expected sections',
      'Cultural Tone Advisor — detects writing register and flags mismatches against the cultural norms of the target market',
    ],
    steps: [
      {
        step: 1,
        title: 'Select target market',
        description:
          "When starting a new analysis, optionally select your target country from the 'Target Market' dropdown. If left blank, SmartATS auto-detects from the job description text.",
        tip: 'Auto-detect works well for most English-language JDs. For multilingual or ambiguous postings, choose manually.',
      },
      {
        step: 2,
        title: 'Read Format Audit',
        description:
          'Look for critical (red) and warning (amber) severity items under Format Audit. Critical items can cause your résumé to be rejected by parsers before a human sees it.',
        tip: 'Tables and graphics are the most common critical issues — replace them with plain text equivalents.',
      },
      {
        step: 3,
        title: 'Apply Geography Checklist',
        description:
          'Under Geography Mode, review the per-country format checklist. Items marked as required vary by country — a photo is expected in Germany but can harm you in the US.',
        tip: "If you're applying to multiple countries, run separate analyses with different target markets.",
      },
      {
        step: 4,
        title: 'Check Industry Lens',
        description:
          'Industry Lens classifies the job and lists sections commonly expected in that vertical. A Healthcare role may expect certifications and compliance experience that are not on your résumé.',
        tip: 'Missing sections are suggestions, not hard requirements — use your judgment about relevance.',
      },
      {
        step: 5,
        title: 'Review Cultural Tone',
        description:
          'Cultural Tone Advisor flags register mismatches. An overly casual tone on a German finance application, or an overly formal tone for a US startup, can signal poor cultural fit.',
        tip: 'The advisor focuses on language patterns, not just formal/informal — directness, confidence markers, and pronoun usage all factor in.',
      },
    ],
    bestPractices: [
      'Run analyses with a specific target country selected whenever you know where the company is based',
      'Fix critical Format Audit issues before re-running — they affect your ATS score directly',
      'Use Industry Lens to discover what sections experienced candidates in that vertical include that you might be missing',
      'Cultural Tone feedback applies to your résumé text — use it as input when editing your experience bullets',
    ],
    troubleshooting: [
      {
        problem: 'Resume Intelligence panels show "not available"',
        solution:
          'This means the analysis was run before Resume Intelligence shipped. Re-run the analysis to get the four panels populated.',
      },
      {
        problem: 'Geography Mode shows incorrect country',
        solution:
          'Auto-detect reads the job description text for location signals. If it is wrong, re-run the analysis with a manual country selection from the Target Market dropdown.',
      },
    ],
    relatedTopics: ['ATS Analysis', 'Skill Profile', 'Resume Management'],
  },

  profileSettings: {
    id: 'profileSettings',
    title: 'Profile & Settings Management',
    description:
      'Learn how to configure your profile, manage account settings, and customize your Smart ATS experience.',
    overview:
      'Your profile settings control how the system knows about you and your preferences. The Settings page opens with a "Your Plan" section at the top showing your current plan tier and a side-by-side comparison of Free, Pro, Max, and C-Level tiers — so you can see exactly what each plan unlocks. Complete profile information improves analysis quality and helps customize recommendations to your career level and goals.',
    keyFeatures: [
      'Personal information management',
      'Professional summary configuration',
      'Contact details and social links',
      'Notification preferences (coming soon)',
      'Security and privacy settings',
      'Account data management',
      'Your Plan section: see your current tier, compare all plans, and request early access to Pro or Max',
      "Upgrade path: clicking 'Upgrade' from any locked feature takes you directly to the Your Plan section",
    ],
    steps: [
      {
        step: 1,
        title: 'Complete Basic Information',
        description:
          'Fill in your first name, last name, and email address to ensure proper account identification.',
        tip: 'Use your professional email address for consistency across job applications.',
      },
      {
        step: 2,
        title: 'Add Contact Details',
        description:
          'Include phone number and location information to help with location-based job matching.',
        tip: 'Location information can help the system better understand regional job market requirements.',
      },
      {
        step: 3,
        title: 'Write Professional Summary',
        description:
          'Add a brief professional summary that describes your career focus and key qualifications.',
        tip: 'A good summary helps contextualize your experience level for more accurate analysis recommendations.',
      },
      {
        step: 4,
        title: 'Link Professional Profiles',
        description:
          'Add your LinkedIn URL and portfolio website to provide additional context about your professional presence.',
        tip: 'Professional links help validate your experience and can provide additional keywords for analysis.',
      },
      {
        step: 5,
        title: 'Configure Preferences',
        description:
          'Set up notification preferences and other account settings to customize your experience.',
        tip: 'Notification settings will help you stay informed about completed analyses and system updates when available.',
      },
      {
        step: 6,
        title: 'Review Security Settings',
        description:
          'Manage password, two-factor authentication, and other security features to protect your account.',
        tip: 'Strong security practices protect your personal information and career documents.',
      },
    ],
    bestPractices: [
      'Keep your profile information current and accurate for better system recommendations',
      'Use professional contact information that you check regularly',
      'Write a concise professional summary that highlights your key strengths and career focus',
      'Include valid URLs for LinkedIn and portfolio sites to enhance your professional presence',
      'Regularly review and update your settings as your career progresses',
      'Use strong, unique passwords and enable two-factor authentication when available',
    ],
    troubleshooting: [
      {
        problem: 'Cannot save profile changes',
        solution:
          'Check that all required fields are filled and email format is valid. Try refreshing the page and attempting again.',
      },
      {
        problem: 'LinkedIn or portfolio URL not accepting',
        solution:
          'Ensure URLs include https:// and are formatted correctly. Test the links in a browser to verify they work.',
      },
      {
        problem: 'Profile information not appearing in analyses',
        solution:
          "Profile information provides context but doesn't directly affect analysis. The main factors are resume content and job description matching.",
      },
      {
        problem: "The Upgrade button says 'billing coming soon'",
        solution:
          "Billing via Stripe is launching in an upcoming release (P22). Click 'Request early access' in the upgrade dialog to be notified and get early access at your chosen tier.",
      },
    ],
    relatedTopics: ['Dashboard Overview', 'Resume Management', 'Account Security'],
  },

  enrichedExperiences: {
    id: 'enrichedExperiences',
    title: 'Experience Enrichment',
    description:
      'Learn how to generate, review, and apply AI-powered improvements to your resume experience bullets.',
    overview:
      'Experience Enrichment uses AI to transform vague job descriptions into compelling, ATS-friendly achievement statements. Each suggestion is checked against honest guardrails so you only apply content that reflects your real work. You review every suggestion before it is saved.',
    keyFeatures: [
      'AI-generated experience bullet suggestions',
      'Accept, edit, or reject each suggestion',
      'Interview-safe guardrail badges',
      'Copy approved bullets to clipboard',
      'Edit saved experiences at any time',
      'Metrics dashboard: Acceptance Rate, ATS Delta',
    ],
    steps: [
      {
        step: 1,
        title: 'Open the Enrichment Wizard',
        description:
          "Click the 'Enrich Experience' button at the top of the page to open the enrichment modal.",
        tip: 'You need at least one uploaded resume and one job description before generating suggestions.',
      },
      {
        step: 2,
        title: 'Select Resume and Job Description',
        description:
          'Choose the resume version and the target job description you want to optimize for.',
        tip: 'Select the job description that best matches the role you are actively applying for.',
      },
      {
        step: 3,
        title: 'Generate a Suggestion',
        description:
          'The AI analyzes the gap between your resume and the job description and generates an enhanced experience bullet.',
        tip: 'Generation takes a few seconds. The AI focuses on measurable outcomes and relevant keywords.',
      },
      {
        step: 4,
        title: 'Review the Suggestion',
        description:
          "Read the suggestion carefully. Check the 'Interview-safe' badge and confidence score. Accept if accurate, or edit to correct metrics.",
        tip: 'Only accept suggestions whose metrics and achievements you can genuinely defend in an interview.',
      },
      {
        step: 5,
        title: 'Save or Reject',
        description:
          'Click Accept to save the suggestion as-is, Edit to customize wording before saving, or Reject to discard it.',
        tip: 'Rejected suggestions are tracked to help improve future generation quality.',
      },
      {
        step: 6,
        title: 'Copy to Your Resume',
        description:
          "Use the 'Copy text' button on any saved experience to copy the bullet to your clipboard, then paste it into your resume.",
        tip: 'Copy bullets directly into your resume editor for immediate improvement.',
      },
    ],
    bestPractices: [
      'Only accept suggestions that accurately describe your real work and outcomes',
      'Edit AI metrics (e.g. percentages, team sizes) to match your actual experience before saving',
      'Use the Interview-safe badge as a signal, but always verify the content yourself',
      'Enrich experiences for each job description you actively target',
      'Review the Acceptance Rate metric — low rates may indicate your resume needs more detail as input',
      'Use the Avg ATS Delta to measure how much enrichment is improving your scores',
    ],
    troubleshooting: [
      {
        problem: 'Suggestion seems inflated or inaccurate',
        solution:
          'Click Edit and adjust the figures to reflect your actual outcomes before saving. Never save inaccurate claims.',
      },
      {
        problem: 'No suggestions are generated',
        solution:
          'Ensure your resume has sufficient experience text and the selected job description contains skill requirements. Try a different resume or job description.',
      },
      {
        problem: 'Cannot delete or edit a saved experience',
        solution: 'Refresh the page and try again. If the problem persists, contact support.',
      },
      {
        problem: 'Copy button is not working',
        solution:
          'Allow clipboard permissions in your browser settings, or manually select and copy the suggestion text.',
      },
    ],
    relatedTopics: ['Resume Management', 'ATS Analysis', 'Upskilling Roadmaps'],
  },

  upskillingRoadmaps: {
    id: 'upskillingRoadmaps',
    title: 'Upskilling Roadmaps',
    description:
      'Learn how to use AI-generated learning roadmaps to close skill gaps and improve your ATS scores over time.',
    overview:
      'Upskilling Roadmaps are personalized learning plans generated from your ATS analysis results. Each roadmap contains sequenced milestones targeting the skill gaps identified between your resume and a specific job. Check off milestones as you complete them to track your progress toward being a stronger candidate.',
    keyFeatures: [
      'AI-generated milestone sequences from ATS analysis',
      'Sequenced learning steps to close role-specific skill gaps',
      'Progress tracking with per-milestone completion toggles',
      'Multiple roadmaps for different target roles',
      'Roadmap selector when tracking multiple roles',
      'Refresh button to sync latest progress from server',
    ],
    steps: [
      {
        step: 1,
        title: 'Generate a Roadmap from an ATS Analysis',
        description:
          'Go to the ATS Analyses page, open a completed analysis, and use the Generate Roadmap option to create a roadmap for that job.',
        tip: 'Run a fresh ATS analysis before generating a roadmap to ensure the skill gap data is current.',
      },
      {
        step: 2,
        title: 'Navigate to Upskilling Roadmaps',
        description:
          'Open the Upskilling Roadmaps page from the main navigation. Your generated roadmap will appear here automatically.',
        tip: 'Roadmaps are tied to the target role from your ATS analysis.',
      },
      {
        step: 3,
        title: 'Select a Roadmap (if multiple)',
        description:
          'If you have roadmaps for multiple roles, use the roadmap selector at the top to switch between them.',
        tip: 'Create separate roadmaps for each job type you are actively targeting.',
      },
      {
        step: 4,
        title: 'Work Through Milestones',
        description:
          'Read each milestone and complete the recommended learning activities. Milestones are ordered by sequence — work from top to bottom.',
        tip: 'Earlier milestones often build the foundational skills required by later ones.',
      },
      {
        step: 5,
        title: 'Mark Milestones Complete',
        description:
          'Check the checkbox next to each milestone when you have completed the learning activity. Your progress is saved automatically.',
        tip: 'Completed milestones are preserved across sessions so you can track long-term progress.',
      },
      {
        step: 6,
        title: 'Re-run ATS Analysis to Measure Improvement',
        description:
          'After completing several milestones, upload an updated resume and re-run your ATS analysis to see whether your score has improved.',
        tip: 'Consistent upskilling combined with resume updates should move your ATS score closer to 80%+.',
      },
    ],
    bestPractices: [
      'Create roadmaps for every role type you are actively targeting',
      'Work milestones sequentially — foundational skills are ordered first',
      'Re-run ATS analyses after completing milestones to track score improvement',
      'Focus on required-skill milestones before preferred-skill milestones',
      'Use the Refresh button if your latest milestone progress is not showing',
      'Combine upskilling with Experience Enrichment to maximize ATS score gains',
    ],
    troubleshooting: [
      {
        problem: 'No roadmaps are showing',
        solution:
          'Roadmaps are generated from completed ATS analyses. Go to the ATS Analyses page and generate a roadmap from a completed analysis.',
      },
      {
        problem: 'Milestone completion is not saving',
        solution:
          'Click the Refresh button and try toggling the milestone again. If it persists, reload the page.',
      },
      {
        problem: 'Roadmap content seems too generic',
        solution:
          'Provide a more detailed and complete job description when running the ATS analysis. More specific job requirements produce more targeted milestones.',
      },
      {
        problem: 'Cannot see my roadmap after generating it',
        solution:
          'Use the Refresh button on this page. If the roadmap still does not appear, try navigating away and back.',
      },
    ],
    relatedTopics: ['ATS Analysis', 'Experience Enrichment', 'Resume Management'],
  },

  gapAnalysis: {
    id: 'gapAnalysis',
    title: 'Gap Analysis',
    description:
      'See exactly which skills and certifications stand between you and your target role — and get a prioritized action plan to close each gap. Available on Pro and above.',
    overview:
      'Gap Analysis compares your current skill profile against real job posting data for your chosen role family and target market. It produces a prioritized gap matrix grouped into Critical, Important, and Nice-to-Have gaps. Each gap comes with the market frequency of that skill, a recommended action, an estimated time to close, and a ready-to-use resume language template. From here you can generate an Upskilling Roadmap driven directly by your critical and important gaps.',
    keyFeatures: [
      'Role family and target market selector (NZ, AU, UK, BR, US)',
      'Three-tier gap matrix: Critical, Important, and Nice-to-Have',
      'Market frequency bar showing how often each skill appears in real job postings',
      'Signal type badge (skill, certification, experience, keyword)',
      'Recommended action and estimated weeks to close for each gap',
      'Expandable resume language template per gap item',
      '"Generate Roadmap from Gaps" creates a targeted upskilling roadmap and navigates to /roadmaps',
    ],
    steps: [
      {
        step: 1,
        title: 'Set your Career Goals in Settings',
        description:
          'Before using Gap Analysis, go to Settings and fill in the Career Goals card with your target role and target market. These values pre-populate the dropdowns on the Gap Analysis page.',
        tip: 'Keeping your Career Goals current means every Gap Analysis refresh uses your latest ambitions automatically.',
      },
      {
        step: 2,
        title: 'Open Gap Analysis',
        description:
          'Navigate to Gap Analysis from the sidebar. Select your target role family and target market from the dropdowns at the top of the page.',
        tip: 'Choose the market where you are actively applying — gap frequency data is sourced from real postings in that region.',
      },
      {
        step: 3,
        title: 'Refresh the Analysis',
        description:
          'Click "Refresh Analysis" to compute your gap matrix. The system compares your skill profile against job posting signals for the selected role and market.',
        tip: 'Re-run after updating your resume or skill profile to see how your gaps have changed.',
      },
      {
        step: 4,
        title: 'Review Critical Gaps first',
        description:
          'Start with the Critical Gaps section. These are the skills and certifications that appear most frequently in postings for your target role and are absent from your profile.',
        tip: 'Critical gaps with a market frequency above 70% are high-priority — employers treat these as baseline expectations.',
      },
      {
        step: 5,
        title: 'Expand gap items for detail',
        description:
          'Click any gap item to expand it and see the signal type badge, recommended action, estimated weeks to close, and a resume language template you can copy directly into your resume.',
        tip: 'Use the resume language template as a starting point — edit figures and context to reflect your real experience before adding it to your resume.',
      },
      {
        step: 6,
        title: 'Generate a Roadmap from your gaps',
        description:
          'Click "Generate Roadmap from Gaps" to create an upskilling roadmap built from your Critical and Important gaps. You are taken to the Roadmaps page automatically when it is ready.',
        tip: 'The generated roadmap sequences milestones by estimated time to close — shorter wins come first to build momentum.',
      },
    ],
    bestPractices: [
      'Update your skill profile before running Gap Analysis — the gap matrix is only as accurate as your profile',
      'Focus on Critical gaps with the highest market frequency before moving to Important gaps',
      'Use the estimated weeks to close to prioritize gaps you can realistically address before your next application deadline',
      'Forward job alert emails to your Smart ATS inbound address so the gap matrix is based on current postings for your market',
      'Re-run Gap Analysis monthly or after any significant resume update to track progress',
      'Use the resume language templates as drafts — always tailor them to your actual experience before applying',
    ],
    troubleshooting: [
      {
        problem: 'Gap Analysis shows no data or an empty matrix',
        solution:
          'The analysis requires real job posting data for your selected role and market. Make sure you have forwarded at least a few job alert emails to your Smart ATS inbound address via Settings → Email Job Alerts. Then select your role and market and click Refresh Analysis.',
      },
      {
        problem: 'My target role or market is not in the dropdown',
        solution:
          'Select the closest available role family. Role families are broad groupings — for example, "Software Engineering" covers both frontend and backend roles. Contact support if your target is consistently missing.',
      },
      {
        problem: 'Gap Analysis is gated and I cannot access it',
        solution:
          'Gap Analysis is available on Pro and above. Your current plan does not include this feature. Upgrade your plan from the Settings page.',
      },
      {
        problem: 'Skills I already have are showing as gaps',
        solution:
          'Check that those skills are listed in your skill profile under Settings → Skill Profile. Skills only appear in your profile after an ATS analysis or LinkedIn import — add any missing skills by running a fresh analysis or re-importing your LinkedIn profile.',
      },
    ],
    relatedTopics: ['upskillingRoadmaps', 'skillProfile', 'atsAnalysis', 'proactiveMatches'],
  },

  proactiveMatches: {
    id: 'proactiveMatches',
    title: 'Proactive Opportunities',
    description:
      'Understand how the system discovers high-match job opportunities for you automatically and how to act on them.',
    overview:
      'The Opportunities page shows job listings that the system has proactively discovered and scored against your profile. Only opportunities with an ATS compatibility score above 60% appear here, sorted from highest to lowest match. Use this page to quickly identify positions you are well-qualified for without manual searching.',
    keyFeatures: [
      'Automatic job discovery above 60% ATS match',
      'Score sorted from highest to lowest match',
      'Score breakdown: Skills Alignment, Experience Relevance, Domain Fit, Format Quality',
      'Missing skills list per opportunity',
      'Link to original job posting',
      'Discovery date for each match',
    ],
    steps: [
      {
        step: 1,
        title: 'Check Your Opportunities Regularly',
        description:
          'The system continuously discovers and scores job postings in the background. Visit this page regularly to see new high-match opportunities.',
        tip: 'Opportunities are ordered by ATS score, so the best matches always appear at the top.',
      },
      {
        step: 2,
        title: 'Review the ATS Score Badge',
        description:
          'Each opportunity card shows a score badge. Green badges (80%+) indicate strong matches. Blue badges (60–79%) indicate good potential matches.',
        tip: 'Prioritize green-badged opportunities for your immediate applications.',
      },
      {
        step: 3,
        title: 'Examine the Score Breakdown',
        description:
          'Expand the score breakdown to see how you scored on Skills Alignment, Experience Relevance, Domain Fit, and Format Quality.',
        tip: 'Low sub-scores point to the specific areas most worth addressing in your resume or skills.',
      },
      {
        step: 4,
        title: 'Identify Missing Skills',
        description:
          "Review the 'Missing Skills' section on each card to see the skill gaps between your resume and this opportunity.",
        tip: 'Use these missing skills to guide your Upskilling Roadmap priorities.',
      },
      {
        step: 5,
        title: 'View the Original Job Posting',
        description:
          "Click 'View Original Posting' to open the full job listing in a new tab and read the complete requirements.",
        tip: 'Always read the full posting before applying — the ATS score is a signal, not a guarantee of fit.',
      },
      {
        step: 6,
        title: 'Run a Manual ATS Analysis for Deep Review',
        description:
          'For your top matches, go to ATS Analyses and run a manual analysis to get detailed improvement suggestions and generate an upskilling roadmap.',
        tip: 'Manual analyses give you AI-powered suggestions for exactly how to improve your resume for that posting.',
      },
    ],
    bestPractices: [
      'Check this page at least a few times per week as new opportunities are discovered continuously',
      'Keep your resumes updated so the system scores against your latest and strongest experience',
      'Treat 80%+ scores as high-priority opportunities and apply promptly',
      'Use missing skills from each card to update your Upskilling Roadmap',
      'Run a manual ATS analysis on your top matches for deeper insight and resume suggestions',
      'Save the original job posting URL before it expires — postings can be taken down quickly',
    ],
    troubleshooting: [
      {
        problem: 'No opportunities are showing',
        solution:
          'The system needs time to discover and score job listings after your account is set up. Check back in 24–48 hours. Ensure your profile is complete to improve discovery quality.',
      },
      {
        problem: 'Score seems lower than expected',
        solution:
          "Run a manual ATS analysis using your newest resume version for a more detailed view. The proactive score uses the system's best available resume at discovery time.",
      },
      {
        problem: "'View Original Posting' button is missing",
        solution:
          'Some automatically discovered jobs may not have a traceable source URL. Search for the job title and company directly on the job board.',
      },
      {
        problem: 'An opportunity listing seems outdated',
        solution:
          'The discovery date shown on each card indicates when the system found it. Always verify the posting is still active before applying.',
      },
    ],
    relatedTopics: ['ATS Analysis', 'Resume Management', 'Upskilling Roadmaps'],
  },

  linkedinProfileImport: {
    id: 'linkedinProfileImport',
    title: 'LinkedIn Profile Import',
    description:
      'Learn how to import your LinkedIn profile to automatically populate your skills and work experience.',
    overview:
      'LinkedIn Profile Import lets you bring your LinkedIn professional data into Smart ATS without manual data entry. The system fetches your public profile, parses it into structured skills and experience, and presents a review modal where you approve or reject each suggested addition before anything is saved.',
    keyFeatures: [
      'Automatic profile fetch from a LinkedIn URL',
      'Structured parsing of skills and work experience',
      'Human-in-the-loop review — nothing is saved without your approval',
      'Fuzzy deduplication against existing resume data',
      'Provenance tagging so imported items are traceable',
    ],
    steps: [
      {
        step: 1,
        title: 'Go to Profile Settings',
        description: 'Navigate to Profile Settings and find the LinkedIn section.',
        tip: 'Your LinkedIn profile must be set to Public for the import to succeed.',
      },
      {
        step: 2,
        title: 'Enter Your LinkedIn Profile URL',
        description:
          'Paste your full LinkedIn profile URL (e.g. https://www.linkedin.com/in/yourname) into the field and click Import.',
        tip: 'Use the URL from your browser address bar when viewing your own profile page.',
      },
      {
        step: 3,
        title: 'Wait for the Fetch to Complete',
        description:
          'The system retrieves and parses your profile. This typically takes 10–30 seconds depending on profile size.',
        tip: 'Do not close the tab while the import is running.',
      },
      {
        step: 4,
        title: 'Review the Import Suggestions',
        description:
          'A review modal appears with all detected skills and experience items. Each item is shown with its source so you know exactly where it came from.',
        tip: 'Review every item carefully. Items already present in your existing resumes are automatically filtered out.',
      },
      {
        step: 5,
        title: 'Approve or Reject Each Item',
        description:
          'Accept items that accurately represent your background. Reject anything that is incorrect, outdated, or already covered in your resume.',
        tip: 'Only accepted items are saved. You can run the import again later if you skip items by mistake.',
      },
    ],
    bestPractices: [
      'Keep your LinkedIn profile up to date before importing — the import reflects your profile at fetch time',
      'Review all items before approving — do not bulk-accept without reading',
      'Use LinkedIn import as a starting point, then refine using Experience Enrichment',
      'Re-import periodically after significant career updates',
    ],
    troubleshooting: [
      {
        problem: 'Import fails or returns no results',
        solution:
          'Check that your LinkedIn profile is set to Public. Private profiles cannot be fetched. If the profile is public and the error persists, try again in a few minutes.',
      },
      {
        problem: 'Imported skills already exist in my resume',
        solution:
          'The system deduplicates against your existing data, but some near-duplicates may still appear. Reject any item that is already covered in your resume.',
      },
      {
        problem: 'The review modal shows no items',
        solution:
          'Your LinkedIn profile may not have structured skill or experience data, or all detected items were already in your resume. Try adding more detail to your LinkedIn profile.',
      },
    ],
    relatedTopics: ['Resume Management', 'Experience Enrichment', 'Profile & Settings Management'],
  },

  resumePersonas: {
    id: 'resumePersonas',
    title: 'Resume Personas',
    description:
      'Learn how to create and manage multiple resume personas for different role types to get more accurate ATS scores.',
    overview:
      'Resume Personas let you maintain separate resume profiles for different career directions — for example, one persona for Engineering Manager roles and another for Senior Engineer roles. Each ATS analysis runs against the active persona, preventing your leadership-focused resume from skewing scores when applying to individual contributor positions.',
    keyFeatures: [
      'Create multiple named personas with different role focuses',
      'Assign a different resume to each persona',
      'Activate a persona before running an ATS analysis',
      'Personas are independent — no cross-contamination between role types',
      'Edit or delete personas as your career goals change',
    ],
    steps: [
      {
        step: 1,
        title: 'Go to Profile Settings → Personas',
        description: 'Navigate to Profile Settings and open the Personas tab.',
        tip: 'You need at least one uploaded resume before creating a persona.',
      },
      {
        step: 2,
        title: 'Create a New Persona',
        description:
          "Click 'Add Persona', give it a descriptive name (e.g. 'Engineering Manager', 'Product Manager — Fintech'), and select the resume to associate with it.",
        tip: 'Name personas after the role type, not the specific job — you will reuse them across many applications.',
      },
      {
        step: 3,
        title: 'Activate a Persona',
        description:
          "Set a persona as Active before running an ATS analysis. The active persona's resume is used as the input for scoring.",
        tip: 'Always check which persona is active before starting a new analysis, especially if you switch roles frequently.',
      },
      {
        step: 4,
        title: 'Run ATS Analysis with the Active Persona',
        description:
          'Go to ATS Analyses and start a new analysis. The system automatically uses the active persona resume for scoring.',
        tip: 'If the score seems off, verify you have the right persona active for the job type you are targeting.',
      },
      {
        step: 5,
        title: 'Manage Personas Over Time',
        description:
          'Update a persona when you upload a new resume version, rename it as your focus evolves, or delete it when no longer needed.',
        tip: 'Archive old personas by renaming them (e.g. "EM — 2025") instead of deleting to preserve history.',
      },
    ],
    bestPractices: [
      'Create one persona per distinct role type — do not create one per job application',
      'Keep persona resumes up to date when you upload new resume versions',
      'Always verify the active persona before starting an analysis session',
      'Use descriptive persona names that clearly reflect the role focus',
    ],
    troubleshooting: [
      {
        problem: 'ATS score seems wrong for the job type',
        solution:
          'Check that the correct persona is active. Go to Profile Settings → Personas and confirm the active persona matches your target role.',
      },
      {
        problem: 'Cannot create a persona',
        solution:
          'You must have at least one uploaded resume to create a persona. Upload a resume first from the Resume Management page.',
      },
      {
        problem: 'Persona resume is outdated',
        solution:
          'Upload your latest resume on the Resume Management page, then go to Profile Settings → Personas and update the persona to point to the new version.',
      },
    ],
    relatedTopics: ['Resume Management', 'ATS Analysis', 'LinkedIn Profile Import'],
  },

  adminLogging: {
    id: 'adminLogging',
    title: 'Admin Panel',
    description:
      'Learn how to use the Admin Panel to view application logs, manage feature flags, set per-user plan overrides, and observe job description data across all users.',
    overview:
      'The Admin Panel gives authorized users full visibility and control over the application. It includes a Log Viewer for diagnosing issues, a Feature Flags panel for toggling capabilities per plan tier, a Plan Overrides panel for granting individual users elevated access, and a Job Descriptions panel showing all user-submitted JDs. This panel is only visible to admin-role accounts.',
    keyFeatures: [
      'Log Viewer with level filter (ERROR, WARN, INFO, DEBUG, TRACE) and time window filter',
      'Per-script logging toggle and retention policy management',
      'Feature Flags panel — toggle any feature on or off per plan tier',
      'Plan Overrides panel — set a specific plan tier for individual users',
      'Job Descriptions panel — cross-user JD table with search and source filters',
      'ATS Debug Modal is plan-gated: Score Breakdown (Pro+), CV Optimisation (Pro+), Model Details/Prompts/AI Output/Usage (Max+). Free users see score, skills, and errors.',
    ],
    steps: [
      {
        step: 1,
        title: 'Open the Admin Panel',
        description:
          'Navigate to Admin from the sidebar. This section is only visible to admin-role accounts.',
        tip: 'If you cannot see the Admin menu item, your account does not have admin privileges.',
      },
      {
        step: 2,
        title: 'Filter Logs by Level and Time',
        description:
          'In the Log Viewer tab, select a log level (ERROR is the default) and a time window. Click Refresh to load matching entries.',
        tip: 'Start with ERROR + Last 1 hour for incident triage. Switch to INFO or DEBUG only when investigating specific flows.',
      },
      {
        step: 3,
        title: 'Search Log Content',
        description:
          'Use the search field to filter log entries by keyword, component name, or request ID.',
        tip: 'Search by request_id to trace a single user action end-to-end across frontend and edge function logs.',
      },
      {
        step: 4,
        title: 'Manage Feature Flags',
        description:
          'Open the Feature Flags tab to see a grid of every feature key against each plan tier. Toggle the switch for any feature-tier cell to enable or disable that capability. Click Save to apply changes.',
        tip: 'Changes take effect for new page loads within about 5 minutes as client caches refresh. Test in an incognito window to confirm the new flag state.',
      },
      {
        step: 5,
        title: 'Set a Plan Override for a User',
        description:
          'Open the Plan Overrides tab, search for a user by email, select their override tier from the dropdown, and click Save. The user immediately sees features available on that tier.',
        tip: 'Use plan overrides to grant beta access to specific users without changing their billing. Remove the override to revert them to their standard plan.',
      },
      {
        step: 6,
        title: 'Inspect Job Descriptions',
        description:
          'Open the Job Descriptions tab to view a filterable table of all user-submitted job descriptions across the platform. Filter by source type, date range, or search by keyword.',
        tip: 'Use this panel to identify test contamination (e.g. example.com URLs) or to audit ingestion quality after a new ingest method ships.',
      },
    ],
    bestPractices: [
      'Use ERROR + Last 1 hour as the default Log Viewer view when opening the panel during an incident',
      'Disable DEBUG/TRACE logging in production unless actively debugging a specific issue',
      'Search by request_id to correlate frontend events with edge function responses',
      'Review retention policies monthly to balance observability with storage costs',
      'Document any plan overrides you set so they can be removed after testing is complete',
      'Use Admin → Plan Overrides to elevate a test user to Pro or Max to verify Debug Modal gating at each tier without waiting for billing.',
    ],
    troubleshooting: [
      {
        problem: 'Admin menu is not visible',
        solution:
          'The Admin Panel requires an admin-role account. Contact your system administrator to request elevated access.',
      },
      {
        problem: 'Log Viewer shows no entries',
        solution:
          'Widen the time window or lower the log level filter. Also verify that logging is enabled for the scripts you are investigating.',
      },
      {
        problem: 'Log entries are not updating in real time',
        solution:
          'The Log Viewer does not auto-refresh. Click the Refresh button to load the latest entries.',
      },
      {
        problem: 'Feature flag change is not taking effect',
        solution:
          'Flag changes are cached for up to 5 minutes on the client. Ask the user to reload the app or test in a fresh incognito session to see the updated state immediately.',
      },
      {
        problem: 'Plan override does not appear to change available features',
        solution:
          'The user must reload the app after an override is set. If features are still incorrect after a reload, confirm the override was saved successfully in the Plan Overrides tab.',
      },
      {
        problem: 'A Pro user says they cannot see the AI Output or Usage tabs in the Debug Modal',
        solution:
          "These tabs require Max+. Pro unlocks Score Breakdown and CV Optimisation. Check the user's plan_override in Admin → Plan Overrides, or ask them to verify their plan in Settings → Your Plan.",
      },
    ],
    relatedTopics: ['Dashboard Overview', 'Profile & Settings Management'],
  },

  accountDeletion: {
    id: 'accountDeletion',
    title: 'Account Deletion & Data Removal',
    description:
      'Understand how to request permanent deletion of your Smart ATS account and all associated data.',
    overview:
      'You can request complete deletion of your Smart ATS account at any time. When you submit a deletion request, your account enters a 30-day grace period during which you can cancel if you change your mind. After the grace period, all data — resumes, job descriptions, analyses, enriched experiences, and associated files — is permanently and irreversibly purged.',
    keyFeatures: [
      '30-day cancellation window before permanent deletion',
      'Full data purge: resumes, analyses, enriched experiences, storage files',
      'Cancel deletion request from Profile Settings within the grace period',
      'Deletion status visible in your account settings',
      'Compliant with right-to-erasure data privacy requirements',
    ],
    steps: [
      {
        step: 1,
        title: 'Export Your Data First',
        description:
          'Before requesting deletion, download or copy any analyses, roadmaps, or enriched experience bullets you want to keep. Data cannot be recovered after the grace period ends.',
        tip: 'Export your ATS analyses and copy any accepted experience bullets to a local document before proceeding.',
      },
      {
        step: 2,
        title: 'Go to Profile Settings → Account',
        description:
          "Navigate to Profile Settings and scroll to the Account section. Click 'Delete Account'.",
        tip: 'The delete option is at the bottom of the Account section.',
      },
      {
        step: 3,
        title: 'Confirm with Your Password',
        description:
          'Re-enter your password to confirm you are the account owner. This is required before the deletion request is accepted.',
        tip: 'If you use a social login (Google, GitHub), you may be redirected to re-authenticate.',
      },
      {
        step: 4,
        title: 'Deletion Request Is Queued',
        description:
          'Your account enters a 30-day deletion window. You can still log in and use the product during this period.',
        tip: 'A banner will appear at the top of each page reminding you that deletion is pending.',
      },
      {
        step: 5,
        title: 'Cancel If You Change Your Mind',
        description:
          "Return to Profile Settings → Account within 30 days and click 'Cancel Deletion Request' to stop the process.",
        tip: 'Cancellation takes effect immediately — your account is fully restored as soon as you cancel.',
      },
      {
        step: 6,
        title: 'Permanent Deletion After Grace Period',
        description:
          'If you do not cancel within 30 days, all your data is permanently deleted and your account is closed. This action cannot be undone.',
        tip: 'You will receive an email confirmation when deletion is complete.',
      },
    ],
    bestPractices: [
      'Export any valuable analysis results, roadmaps, or experience bullets before requesting deletion',
      'Use the 30-day window to make sure you have saved everything you need',
      'If you are pausing your job search rather than leaving permanently, consider simply logging out instead',
    ],
    troubleshooting: [
      {
        problem: 'Cannot find the Delete Account option',
        solution:
          'Go to Profile Settings → Account tab and scroll to the bottom. The delete option is in the Danger Zone section.',
      },
      {
        problem: 'Deletion request is not showing as pending',
        solution:
          'Refresh the page. If the request is not reflected in your account settings within a few minutes, contact support.',
      },
      {
        problem: 'Want to cancel but the cancellation button is missing',
        solution:
          'The cancellation option is only available within the 30-day window. If the window has passed, the deletion is final.',
      },
      {
        problem: 'Data still visible after the grace period',
        solution:
          'Deletion is processed asynchronously and may take a few hours after the grace period ends. If data is still visible after 24 hours, contact support.',
      },
    ],
    relatedTopics: ['Profile & Settings Management', 'Dashboard Overview'],
  },

  skillProfile: {
    id: 'skillProfile',
    title: 'Skill Profile',
    description: 'Understand how your AI-classified skill profile improves your ATS match scores.',
    overview:
      'Smart ATS builds a personal skill profile from your work experience using AI. Each skill is classified by category, depth, and recency — and used to weight your ATS analyses so that actively-used skills score higher than skills from early in your career.',
    keyFeatures: [
      'AI classifies skills into technical, soft, leadership, domain, certification, and methodology categories',
      'Skills decay in weight over time based on how recently you used them',
      'Transferable skills extracted from technical roles are preserved at full weight',
      'Career chapters group your skills into distinct phases of your career',
      'Review and correct classifications before they are saved',
    ],
    steps: [
      {
        step: 1,
        title: 'Trigger Classification',
        description:
          'Add your work experience on the Experiences page, then upload or re-analyze a resume. The AI classifies your skills and shows you a review screen before saving.',
        tip: 'The more detailed your experience descriptions, the more accurate the skill classification.',
      },
      {
        step: 2,
        title: 'Review and Confirm',
        description:
          "For each skill, choose whether you still actively use it, treat it as a foundation only, or add context explaining why it's more relevant than it looks (Pro/Max plan).",
        tip: 'Marking a skill as "still active" updates its last-used year to now, giving it full weight in analyses.',
      },
      {
        step: 3,
        title: 'Manage Your Profile',
        description:
          'Go to Settings → Skill Profile to see all your skills grouped by career chapter. Remove any skills that are no longer accurate.',
        tip: 'Deleted skills are removed from future ATS analyses but your experience records are unchanged.',
      },
    ],
    bestPractices: [
      'Review the classification before confirming — the AI is accurate but your judgment matters',
      'Use the "let me explain" option for skills that sound outdated but are still relevant to your target role',
      'Keep your experience descriptions current so re-classification improves over time',
    ],
    troubleshooting: [
      {
        problem: 'No skill profile appears in Settings',
        solution:
          'Skill classification runs when you upload a resume or trigger analysis. Make sure you have at least one experience added in the Experiences page.',
      },
      {
        problem: 'My score did not improve after saving my skill profile',
        solution:
          'Skill context is injected into new analyses. Re-run ATS Analysis on an existing resume-job pair to see the updated score.',
      },
    ],
    relatedTopics: ['Enriched Experiences', 'ATS Analysis', 'Profile & Settings Management'],
  },

  profileFitAnalyzer: {
    id: 'profileFitAnalyzer',
    title: 'Profile Fit Analyzer',
    description:
      'Get a 0–100 fit score showing how well your LinkedIn profile and skills match real market demand for your target role. Available on Pro and above.',
    overview:
      'Profile Fit Analyzer compares your imported LinkedIn profile against live job market signals for your target role and market. It produces a weighted fit score, a gap breakdown sorted by tier (Critical, Important, Nice-to-Have), and AI-generated recommended actions for each gap. Max plan users also get a Reconciliation view that highlights conflicts between your LinkedIn data and your uploaded resume, plus a score history chart to track improvement over time.',
    keyFeatures: [
      'Weighted 0–100 fit score based on signal coverage across your profile',
      'Gap breakdown by tier: Critical, Important, and Nice-to-Have',
      'AI-generated recommended action and rationale for each gap',
      'Reconciliation view — highlights conflicts between LinkedIn profile and resume (Max+)',
      'Score history chart to track your fit score over time (Max+)',
      'Requires LinkedIn Profile Import and career goals to be set in Settings',
    ],
    steps: [
      {
        step: 1,
        title: 'Complete LinkedIn Import and Career Goals',
        description:
          'Before running a fit analysis, import your LinkedIn profile in Settings → LinkedIn Import and set your target role and market in Settings → Career Goals. Both are required for an accurate fit score.',
        tip: 'Keep your LinkedIn profile current before importing — the fit score reflects the profile data at import time.',
      },
      {
        step: 2,
        title: 'Navigate to Profile Fit',
        description:
          'Go to Profile Fit from the sidebar. Your current target role and market are shown at the top.',
        tip: 'If the role or market shown is wrong, update your Career Goals in Settings first.',
      },
      {
        step: 3,
        title: 'Run a Fit Analysis',
        description:
          'Click "Analyze Fit" to start a new analysis. The system compares your profile against job market signals and returns a fit score with a full gap breakdown.',
        tip: 'Analysis takes a few seconds. Each run is saved to your history so you can track progress.',
      },
      {
        step: 4,
        title: 'Review your Fit Score',
        description:
          'Read the overall fit score card. Scores above 70 indicate strong alignment with market expectations. Scores below 50 suggest significant gaps worth addressing before applying.',
        tip: 'The score is weighted — Critical gaps have more impact than Nice-to-Have gaps on your overall score.',
      },
      {
        step: 5,
        title: 'Work through the Gap Breakdown',
        description:
          'Expand each gap tier to see the specific skills, certifications, or experiences you are missing. Each item shows a recommended action to address it.',
        tip: 'Start with Critical gaps — these are the skills that appear most frequently in real postings for your target role.',
      },
      {
        step: 6,
        title: 'Review Reconciliation Conflicts (Max plan)',
        description:
          'If you are on the Max plan, the Reconciliation section highlights discrepancies between your LinkedIn profile and your uploaded resume. Resolve conflicts by updating the weaker source.',
        tip: 'Reconciliation conflicts indicate your two data sources are telling different stories — recruiters who check both will notice.',
      },
    ],
    bestPractices: [
      'Re-run fit analysis after updating your LinkedIn profile or uploading a new resume to track score improvement',
      'Focus on Critical gaps with the highest market frequency — these are the skills employers treat as baseline requirements',
      'Use the score history chart (Max plan) to confirm your profile improvements are moving the needle',
      'Combine Profile Fit with Gap Analysis to get both a profile-level score and a skill-level action plan',
      'Resolve reconciliation conflicts before applying — consistency between your resume and LinkedIn profile builds recruiter confidence',
    ],
    troubleshooting: [
      {
        problem: 'Profile Fit is locked and I cannot run an analysis',
        solution:
          'Profile Fit Analyzer is available on Pro and above. Upgrade your plan from the Settings page to unlock this feature.',
      },
      {
        problem: 'Fit score is unexpectedly low despite strong experience',
        solution:
          'Check that your LinkedIn profile is fully imported and your career goals match the role you are targeting. Missing or mismatched data reduces signal coverage and lowers the score.',
      },
      {
        problem: 'No market signals found error',
        solution:
          'The analyzer requires job posting data for your selected role and market. Forward a few job alert emails to your Smart ATS inbound address via Settings → Email Job Alerts to populate the signal database.',
      },
      {
        problem: 'Reconciliation and score history sections are locked',
        solution:
          'Reconciliation and score history are Max plan features. The gap breakdown and recommended actions are available on Pro.',
      },
    ],
    relatedTopics: ['gapAnalysis', 'linkedinProfileImport', 'skillProfile', 'upskillingRoadmaps'],
  },

  emailJobAlerts: {
    id: 'emailJobAlerts',
    title: 'Email Job Alerts Ingestion',
    description:
      'Forward job alert emails from LinkedIn and other job boards to automatically populate your opportunities pipeline.',
    overview:
      'Smart ATS provides a personal inbound email address you can use as a forwarding destination for job alert emails. When you forward an alert, the system extracts individual job listings, stages them for ATS scoring against your profile, and surfaces high-match results on your Opportunities page. This keeps your pipeline fresh without manual job searches.',
    keyFeatures: [
      'Personal inbound address shown in Settings → Email Job Alerts',
      'Parses LinkedIn job alert emails and generic job board alerts (Seek, Indeed, Lever, Greenhouse)',
      'Each extracted job is automatically scored against your resume',
      'Matches above the threshold appear on your Opportunities page',
      'Duplicate jobs are silently skipped — forwarding the same alert twice is safe',
      'Sender allowlist protects against spam — only forwarded emails from known addresses are processed',
    ],
    steps: [
      {
        step: 1,
        title: 'Find Your Inbound Email Address',
        description:
          'Go to Settings and scroll to the Email Job Alerts card. Your personal inbound address is shown there with a copy button.',
        tip: 'This address is unique to your account — do not share it publicly.',
      },
      {
        step: 2,
        title: 'Add Your Address to the Allowlist',
        description:
          'Your own email address must be added to the sender allowlist before forwarded messages are accepted. Contact your admin if you cannot see the allowlist setting.',
        tip: 'The allowlist prevents unknown senders from injecting jobs into your pipeline. Only emails from listed addresses are processed.',
      },
      {
        step: 3,
        title: 'Set Up Forwarding in Your Email Client',
        description:
          'In your personal email client, create a filter or rule that automatically forwards job alert emails to your Smart ATS inbound address. Most email clients (Gmail, Outlook) support auto-forwarding rules.',
        tip: 'In Gmail: Settings → See all settings → Forwarding and POP/IMAP → Add a forwarding address. Then create a filter for emails matching the alert sender.',
      },
      {
        step: 4,
        title: 'Forward a Test Alert',
        description:
          'Manually forward one job alert email to your inbound address to verify the pipeline is working. Wait a few minutes, then check your Opportunities page for new matches.',
        tip: 'LinkedIn job alerts with multiple listings in one email are fully supported — all jobs in the email are extracted.',
      },
      {
        step: 5,
        title: 'Monitor Your Opportunities Page',
        description:
          'New high-match jobs from forwarded alerts appear on the Opportunities page within minutes. The source column shows which emails they came from.',
        tip: 'Only jobs that score above the match threshold appear on Opportunities. Lower-scoring jobs are still staged but not surfaced.',
      },
    ],
    bestPractices: [
      'Set up auto-forwarding rules so new alerts reach your pipeline without manual intervention',
      'Subscribe to job alerts on LinkedIn and major job boards for your target role and market to maximize pipeline volume',
      'Forward alerts regularly — the Gap Analysis matrix is more accurate when based on recent postings',
      'Do not forward every email indiscriminately — focus on alerts from your target role family to keep signal quality high',
    ],
    troubleshooting: [
      {
        problem: 'Forwarded email did not produce any new opportunities',
        solution:
          'Check that your email address is on the allowlist in Settings → Email Job Alerts. Also confirm the alert was from a supported source (LinkedIn, Seek, Indeed, Lever, or Greenhouse). Emails from unsupported sources are accepted but may not parse correctly.',
      },
      {
        problem: 'Jobs appear staged but not on the Opportunities page',
        solution:
          'Jobs are only shown on Opportunities if they score above the match threshold against your resume. Update your resume or lower the score threshold from the Settings page.',
      },
      {
        problem: 'Duplicate jobs keep appearing',
        solution:
          'Duplicate detection uses the job content hash — identical jobs forwarded multiple times are silently skipped. If duplicates are appearing, the job descriptions are slightly different across alerts. This is expected behaviour.',
      },
      {
        problem: 'LinkedIn job alert URLs are not being recognized',
        solution:
          'Smart ATS handles both standard LinkedIn job URLs (/jobs/view/) and tracking redirect URLs (/comm/jobs/view/). If a job is still not recognized, the email format may have changed — contact support with a forwarded example.',
      },
    ],
    relatedTopics: ['proactiveMatches', 'gapAnalysis', 'profileFitAnalyzer'],
  },
}

// UPDATE LOG
// 2026-03-01 00:00:00 | Added help content for Enriched Experiences, Upskilling Roadmaps, and Proactive Matches
// 2026-03-18 00:00:00 | CR3-1–CR3-4: Added linkedinProfileImport, resumePersonas, adminLogging, accountDeletion topics
// 2026-03-30 10:00:00 | P25 S6 — Added skillProfile help topic.
// 2026-03-30 12:00:00 | PROD-9–PROD-12 — Added resumeIntelligence topic; updated atsAnalysis with intelligence panel steps and features.
// 2026-04-06 00:00:00 | P26 — Added gapAnalysis help topic for the new /gap Gap Analysis page (Pro+ gated).
// 2026-04-07 12:00:00 | P28 — Added profileFitAnalyzer help topic for /profile-fit (Pro+ gated, RUNTIME-VERIFIED 2026-04-07). Added emailJobAlerts help topic for Settings Email Job Alerts card (ADR-0007, RUNTIME-VERIFIED 2026-04-05). Updated adminLogging to cover Feature Flags and Plan Overrides admin tabs (shipped 2026-04-07).
// 2026-04-07 20:00:00 | Updated atsAnalysis (collapsed cards, filter bar), profileSettings (Your Plan section), adminLogging (Debug Modal plan gating).

export const getHelpContent = (contentId: string): HelpContent | null => {
  return helpContentData[contentId] || null
}
