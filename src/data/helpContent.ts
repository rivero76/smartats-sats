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
    ],
    bestPractices: [
      'Run analyses for every job application to optimize your resume for each position',
      'Use multiple resume versions tailored to different job types or industries',
      'Focus on improving scores incrementally rather than trying to address everything at once',
      'Pay attention to both hard skills (technical) and soft skills (communication, leadership) in results',
      'Re-run analyses after making resume updates to track improvement',
      'Use the debug feature if you encounter issues or unexpected results',
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
    ],
    relatedTopics: ['Resume Management', 'Job Descriptions', 'Dashboard Overview'],
  },

  profileSettings: {
    id: 'profileSettings',
    title: 'Profile & Settings Management',
    description:
      'Learn how to configure your profile, manage account settings, and customize your Smart ATS experience.',
    overview:
      'Your profile settings control how the system knows about you and your preferences. Complete profile information can improve analysis quality and helps customize recommendations to your career level and goals.',
    keyFeatures: [
      'Personal information management',
      'Professional summary configuration',
      'Contact details and social links',
      'Notification preferences (coming soon)',
      'Security and privacy settings',
      'Account data management',
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
        description: "Click the 'Enrich Experience' button at the top of the page to open the enrichment modal.",
        tip: 'You need at least one uploaded resume and one job description before generating suggestions.',
      },
      {
        step: 2,
        title: 'Select Resume and Job Description',
        description: 'Choose the resume version and the target job description you want to optimize for.',
        tip: 'Select the job description that best matches the role you are actively applying for.',
      },
      {
        step: 3,
        title: 'Generate a Suggestion',
        description: 'The AI analyzes the gap between your resume and the job description and generates an enhanced experience bullet.',
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
        description: 'Click Accept to save the suggestion as-is, Edit to customize wording before saving, or Reject to discard it.',
        tip: 'Rejected suggestions are tracked to help improve future generation quality.',
      },
      {
        step: 6,
        title: 'Copy to Your Resume',
        description: "Use the 'Copy text' button on any saved experience to copy the bullet to your clipboard, then paste it into your resume.",
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
          "Open the Upskilling Roadmaps page from the main navigation. Your generated roadmap will appear here automatically.",
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
          "Check the checkbox next to each milestone when you have completed the learning activity. Your progress is saved automatically.",
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
        solution: "Click the Refresh button and try toggling the milestone again. If it persists, reload the page.",
      },
      {
        problem: 'Roadmap content seems too generic',
        solution:
          'Provide a more detailed and complete job description when running the ATS analysis. More specific job requirements produce more targeted milestones.',
      },
      {
        problem: 'Cannot see my roadmap after generating it',
        solution: 'Use the Refresh button on this page. If the roadmap still does not appear, try navigating away and back.',
      },
    ],
    relatedTopics: ['ATS Analysis', 'Experience Enrichment', 'Resume Management'],
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
          "Each opportunity card shows a score badge. Green badges (80%+) indicate strong matches. Blue badges (60–79%) indicate good potential matches.",
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
}

// Updated: 2026-03-01 00:00:00 - Added help content for Enriched Experiences, Upskilling Roadmaps, and Proactive Matches

export const getHelpContent = (contentId: string): HelpContent | null => {
  return helpContentData[contentId] || null
}
