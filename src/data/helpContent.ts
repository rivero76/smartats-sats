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
}

export const getHelpContent = (contentId: string): HelpContent | null => {
  return helpContentData[contentId] || null
}
