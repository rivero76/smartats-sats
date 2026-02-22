// Pattern-based content extraction utilities (no AI)
import { logContentExtraction, createContentExtractionLogger } from '@/lib/jobDescriptionLogger'

export interface JobInfo {
  title: string | null
  company: string | null
  location: {
    city: string | null
    state: string | null
    country: string | null
  } | null
  skills: string[]
  employmentType: string | null
  department: string | null
  salaryRange: string | null
  extractionMeta?: {
    confidence: {
      title: number
      company: number
      location: number
      overall: number
    }
    rules: string[]
    warnings: string[]
  }
}

export interface ResumeInfo {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  skills: string[]
  experience: string | null
  education: string | null
  currentJobTitle: string | null
  recentJobTitles: string[]
}

const UI_NOISE_LINES = new Set([
  'share',
  'show more options',
  'promoted by hirer',
  'actively reviewing applicants',
  'matches you',
  'apply',
  'save',
  'cancel',
])

const LOCATION_WORDS = new Set([
  'remote',
  'hybrid',
  'on-site',
  'onsite',
  'new zealand',
  'australia',
  'united states',
  'united kingdom',
  'canada',
  'singapore',
  'india',
])

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanExtractedText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = normalizeWhitespace(value)
    .replace(/\s*[|·]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned.length ? cleaned : null
}

function normalizeCompanyName(value: string | null | undefined): string | null {
  const cleaned = cleanExtractedText(value)
  if (!cleaned) return null

  // Collapse immediate duplicate tokens: "Databricks Databricks" -> "Databricks"
  const parts = cleaned.split(' ')
  const deduped: string[] = []
  for (const part of parts) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.toLowerCase() === part.toLowerCase()) continue
    deduped.push(part)
  }
  return deduped.join(' ').trim()
}

function sanitizeLine(line: string): string {
  return normalizeWhitespace(line).replace(/\s*logo$/i, '').trim()
}

function parseLinkedInTitleLine(line: string): {
  company: string | null
  title: string | null
  location: string | null
} | null {
  const cleaned = sanitizeLine(line).replace(/\s*\|\s*LinkedIn\s*$/i, '').trim()
  const match = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i)
  if (!match) return null

  return {
    company: cleanExtractedText(match[1]),
    title: cleanExtractedText(match[2]),
    location: cleanExtractedText(match[3]),
  }
}

function extractLinkedInHeaderFromContent(content: string): {
  source: 'linkedin'
  company: string | null
  title: string | null
  location: string | null
} | null {
  const cleaned = normalizeWhitespace(content).replace(/\s*\|\s*LinkedIn\s*/gi, ' | LinkedIn ')
  const headerRegex =
    /([A-Za-z0-9&'. -]{2,80})\s+hiring\s+(.+?)\s+in\s+([A-Za-z0-9,.' -]{2,120})\s*\|\s*LinkedIn/i
  const match = cleaned.match(headerRegex)
  if (!match) return null

  return {
    source: 'linkedin',
    company: cleanExtractedText(match[1]),
    title: cleanExtractedText(match[2]),
    location: cleanExtractedText(match[3]),
  }
}

function parseHiringHeadline(value: string): {
  company: string | null
  title: string | null
  location: string | null
} | null {
  const cleaned = normalizeWhitespace(value)
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .trim()
  const match = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i)
  if (!match) return null
  return {
    company: normalizeCompanyName(match[1]),
    title: cleanExtractedText(match[2]),
    location: cleanExtractedText(match[3]),
  }
}

function extractLinkedInStructuredLines(lines: string[]): {
  company: string | null
  title: string | null
  location: string | null
} {
  const cleaned = lines
    .map(sanitizeLine)
    .filter((line) => line.length > 1 && !isLikelyUiNoise(line))
    .slice(0, 12)

  let company: string | null = null
  let title: string | null = null
  let location: string | null = null

  for (let i = 0; i < cleaned.length; i += 1) {
    const line = cleaned[i]
    if (!company && looksLikeCompanyName(line) && !/\bhiring\b/i.test(line)) {
      company = normalizeCompanyName(line)
      continue
    }
    if (!title && looksLikeJobTitle(line) && !/\bhiring\b/i.test(line)) {
      title = cleanExtractedText(line)
      continue
    }
    if (!location && /,/.test(line) && line.length < 120) {
      location = cleanExtractedText(line)
    }
  }

  return { company, title, location }
}

function extractProviderHeaderFromContent(content: string): {
  source: 'seek' | 'indeed' | 'workday'
  company: string | null
  title: string | null
  location: string | null
} | null {
  const compact = normalizeWhitespace(content)

  const seek = compact.match(/^(.+?)\s+at\s+(.+?)\s+in\s+(.+?)\s*\|\s*SEEK/i)
  if (seek) {
    return {
      source: 'seek',
      title: cleanExtractedText(seek[1]),
      company: cleanExtractedText(seek[2]),
      location: cleanExtractedText(seek[3]),
    }
  }

  const workday = compact.match(/^(.+?)\s+\|\s+(.+?)\s+\|\s+Workday/i)
  if (workday) {
    return {
      source: 'workday',
      title: cleanExtractedText(workday[1]),
      company: cleanExtractedText(workday[2]),
      location: null,
    }
  }

  const indeed = compact.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)\s*\|\s*Indeed/i)
  if (indeed) {
    return {
      source: 'indeed',
      title: cleanExtractedText(indeed[1]),
      company: cleanExtractedText(indeed[2]),
      location: cleanExtractedText(indeed[3]),
    }
  }

  return null
}

function isLikelyUiNoise(line: string): boolean {
  const lower = line.toLowerCase()
  if (UI_NOISE_LINES.has(lower)) return true
  if (lower.includes('applicants')) return true
  if (lower.includes('days ago')) return true
  if (lower.includes('hours ago')) return true
  return false
}

function looksLikeLocation(line: string): boolean {
  const lower = line.toLowerCase()
  if (LOCATION_WORDS.has(lower)) return true
  if (lower.includes(',')) return true
  return /\b(remote|hybrid|on-?site)\b/i.test(line)
}

function looksLikeJobTitle(line: string): boolean {
  return /\b(engineer|developer|manager|analyst|specialist|coordinator|director|lead|designer)\b/i.test(
    line
  )
}

function looksLikeCompanyName(line: string): boolean {
  const cleaned = sanitizeLine(line)
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return false

  const lower = cleaned.toLowerCase()
  if (
    lower.includes('hiring') ||
    lower.includes('about the job') ||
    lower.includes('role summary') ||
    lower.includes("what you'll") ||
    lower.includes('how ') ||
    lower.includes('why ')
  ) {
    return false
  }

  // Prefer short proper-name style lines: "The Good Source", "Acme Labs"
  if (/^[A-Z][A-Za-z0-9&'.-]*(\s+[A-Z][A-Za-z0-9&'.-]*){0,5}$/.test(cleaned)) {
    return true
  }

  return false
}

const COMMON_SKILLS = [
  'JavaScript',
  'Python',
  'Java',
  'React',
  'Node.js',
  'TypeScript',
  'SQL',
  'HTML',
  'CSS',
  'AWS',
  'Docker',
  'Kubernetes',
  'Git',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'Angular',
  'Vue.js',
  'Express',
  'Spring',
  'Django',
  'Flask',
  'Laravel',
  'PHP',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'Ruby',
  'Scala',
  'R',
  'MATLAB',
  'Machine Learning',
  'AI',
  'Data Science',
  'Analytics',
  'Tableau',
  'Power BI',
  'Figma',
  'Sketch',
  'Adobe',
  'Photoshop',
  'Illustrator',
  'UI/UX',
  'Design',
  'Project Management',
  'Agile',
  'Scrum',
  'JIRA',
  'Confluence',
  'Slack',
  'Teams',
]

export function extractJobDescriptionInfo(content: string, sessionId?: string): JobInfo {
  const logger = createContentExtractionLogger(sessionId)
  const appliedRules: string[] = []
  const warnings: string[] = []

  if (!content || content.trim().length < 10) {
    logger.info('Content extraction skipped - insufficient content', {
      contentLength: content?.length || 0,
    })
    return {
      title: null,
      company: null,
      location: null,
      skills: [],
      employmentType: null,
      department: null,
      salaryRange: null,
    }
  }

  logger.info('Starting job description content extraction', {
    contentLength: content.length,
    contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
  })

  const startTime = Date.now()
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const text = content.toLowerCase()

  const linkedInHeader = extractLinkedInHeaderFromContent(content)
  const providerHeader = extractProviderHeaderFromContent(content)
  if (linkedInHeader) appliedRules.push('linkedin_header')
  if (providerHeader) appliedRules.push(`${providerHeader.source}_header`)

  const headerLocation =
    linkedInHeader?.location || providerHeader?.location
      ? {
          city:
            (linkedInHeader?.location || providerHeader?.location || '')
              .split(',')[0]
              ?.trim() || null,
          state:
            (linkedInHeader?.location || providerHeader?.location || '')
              .split(',')[1]
              ?.trim() || null,
          country:
            (linkedInHeader?.location || providerHeader?.location || '')
              .split(',')[2]
              ?.trim() || null,
        }
      : null

  const title = linkedInHeader?.title || providerHeader?.title || extractJobTitle(content, lines)
  const company =
    linkedInHeader?.company || providerHeader?.company || extractCompany(content, lines)
  const location = headerLocation || extractLocation(content, lines)
  const skills = extractSkills(content)
  const employmentType = extractEmploymentType(text)
  const department = extractDepartment(content, lines)
  const salaryRange = extractSalaryRange(content)

  const result: JobInfo = {
    title,
    company,
    location,
    skills,
    employmentType,
    department,
    salaryRange,
  }

  // Final normalization: if headline contains "<Company> hiring <Role> in <Location>",
  // split it into canonical fields to avoid title contamination and missing company.
  const firstLine = lines[0] || ''
  const hiringHeadline = parseHiringHeadline(firstLine) || parseHiringHeadline(content)
  if (hiringHeadline) {
    appliedRules.push('hiring_headline_split')
    if (hiringHeadline.company) result.company = hiringHeadline.company
    if (hiringHeadline.title) result.title = hiringHeadline.title
    if (hiringHeadline.location) {
      const parts = hiringHeadline.location
        .split(',')
        .map((part) => cleanExtractedText(part))
        .filter(Boolean) as string[]
      if (parts.length >= 2) {
        result.location = {
          city: parts[0] || null,
          state: parts[1] || null,
          country: parts[2] || null,
        }
      }
    }
  }

  // If title still has "hiring", split from the title itself as last-resort safety.
  if (/\bhiring\b/i.test(result.title || '')) {
    const titleSplit = parseHiringHeadline(result.title || '')
    if (titleSplit) {
      appliedRules.push('title_hiring_split')
      result.company = titleSplit.company || result.company
      result.title = titleSplit.title || result.title
      if (titleSplit.location) {
        const parts = titleSplit.location
          .split(',')
          .map((part) => cleanExtractedText(part))
          .filter(Boolean) as string[]
        if (parts.length >= 2) {
          result.location = {
            city: parts[0] || null,
            state: parts[1] || null,
            country: parts[2] || null,
          }
        }
      }
    }
  }

  // LinkedIn structured-lines fallback for cases where page title parsing is noisy.
  const structured = extractLinkedInStructuredLines(lines)
  if (!result.company && structured.company) {
    appliedRules.push('linkedin_lines_company')
    result.company = structured.company
  }
  if ((/\bhiring\b/i.test(result.title || '') || !result.title) && structured.title) {
    appliedRules.push('linkedin_lines_title')
    result.title = structured.title
  }
  if (!result.location && structured.location) {
    const parts = structured.location
      .split(',')
      .map((part) => cleanExtractedText(part))
      .filter(Boolean) as string[]
    if (parts.length >= 2) {
      appliedRules.push('linkedin_lines_location')
      result.location = {
        city: parts[0] || null,
        state: parts[1] || null,
        country: parts[2] || null,
      }
    }
  }

  result.company = normalizeCompanyName(result.company)
  if (result.title && result.company) {
    const escapedCompany = result.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefixRegex = new RegExp(`^${escapedCompany}\\s+hiring\\s+`, 'i')
    if (prefixRegex.test(result.title)) {
      appliedRules.push('strip_company_hiring_prefix')
      result.title = result.title.replace(prefixRegex, '').trim()
    }
  }

  const titleHasHiring = /\bhiring\b/i.test(result.title || '')
  if (titleHasHiring) {
    warnings.push('Title still contains "hiring". Review title/company split.')
  }

  const confidence = {
    title: result.title ? (titleHasHiring ? 0.55 : 0.92) : 0.1,
    company: result.company ? 0.9 : 0.15,
    location: result.location ? 0.88 : 0.2,
    overall: 0,
  }
  confidence.overall =
    confidence.title * 0.4 + confidence.company * 0.35 + confidence.location * 0.25

  result.extractionMeta = {
    confidence,
    rules: appliedRules,
    warnings,
  }

  const extractionTime = Date.now() - startTime

  logger.info('Content extraction completed', {
    extractionTime,
    extractedFields: {
      title: !!result.title,
      company: !!result.company,
      location: !!result.location,
      skills: result.skills?.length || 0,
      employmentType: !!result.employmentType,
      department: !!result.department,
      salaryRange: !!result.salaryRange,
    },
    extractionQuality: {
      hasCore: !!(result.title && result.company),
      completeness: [
        result.title,
        result.company,
        result.location,
        result.skills?.length,
        result.employmentType,
      ].filter(Boolean).length,
    },
    extractionRules: appliedRules,
    extractionWarnings: warnings,
    confidence,
  })

  // Log the content extraction for debugging and analytics
  logContentExtraction(content, result, sessionId)

  return result
}

export function extractResumeInfo(content: string): ResumeInfo {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    name: extractPersonName(content, lines),
    email: extractEmail(content),
    phone: extractPhone(content),
    location: extractPersonLocation(content, lines),
    skills: extractSkills(content),
    experience: extractExperience(content, lines),
    education: extractEducation(content, lines),
    currentJobTitle: extractCurrentJobTitle(content, lines),
    recentJobTitles: extractRecentJobTitles(content, lines),
  }
}

function extractJobTitle(content: string, lines: string[]): string | null {
  const linkedInHeader = extractLinkedInHeaderFromContent(content)
  if (linkedInHeader?.title) return linkedInHeader.title

  for (const line of lines.slice(0, 8)) {
    const parsed = parseLinkedInTitleLine(line)
    if (parsed?.title) return parsed.title
  }

  // Look for common job title patterns
  const titlePatterns = [
    /(?:position|role|job\s+title|title):\s*(.+)/i,
    /^(.+(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead|senior|junior))/i,
    /we're\s+(?:looking for|hiring)\s+(?:a|an)\s+(.+)/i,
  ]

  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // Check first few lines for job titles
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 5 &&
      line.length < 120 &&
      (line.includes('Engineer') ||
        line.includes('Developer') ||
        line.includes('Manager') ||
        line.includes('Analyst') ||
        line.includes('Specialist') ||
        line.includes('Director'))
    ) {
      return line
    }
  }

  return null
}

function extractCompany(content: string, lines: string[]): string | null {
  const linkedInHeader = extractLinkedInHeaderFromContent(content)
  if (linkedInHeader?.company) return linkedInHeader.company

  for (const line of lines.slice(0, 8)) {
    const parsed = parseLinkedInTitleLine(line)
    if (parsed?.company) return parsed.company
  }

  const cleanedLines = lines
    .map(sanitizeLine)
    .filter((line) => line.length > 1 && !isLikelyUiNoise(line))

  for (let i = 0; i < Math.min(cleanedLines.length, 12); i += 1) {
    const line = cleanedLines[i]
    if (!line) continue
    if (looksLikeJobTitle(line) || looksLikeLocation(line)) continue
    if (/^\d+$/.test(line)) continue
    if (looksLikeCompanyName(line)) {
      return cleanExtractedText(line)
    }
  }

  const companyPatterns = [
    /(?:company|organization|at|join)\s*:\s*(.+)/i,
    /about\s+([A-Z][a-zA-Z\s&,.-]+)(?:\s+is|\s+was|\s+provides)/i,
    /([A-Z][a-zA-Z\s&,.-]+)\s+is\s+(?:looking|seeking|hiring)/i,
  ]

  for (const pattern of companyPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let company = normalizeWhitespace(match[1])
      // Clean up common suffixes
      company = company.replace(/\s+(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?)$/i, '')
      const firstWord = company.split(/\s+/)[0]?.toLowerCase() || ''
      const blockedFirstWords = new Set(['how', 'what', 'why', 'this', 'that', 'who', 'where'])
      if (blockedFirstWords.has(firstWord)) continue
      if (company.length > 2 && company.length < 50) {
        return cleanExtractedText(company)
      }
    }
  }

  return null
}

function extractLocation(content: string, lines: string[]): JobInfo['location'] {
  const linkedInHeader = extractLinkedInHeaderFromContent(content)
  if (linkedInHeader?.location) {
    const parts = linkedInHeader.location
      .split(',')
      .map((part) => cleanExtractedText(part))
      .filter(Boolean) as string[]
    if (parts.length >= 2) {
      return {
        city: parts[0] || null,
        state: parts[1] || null,
        country: parts[2] || null,
      }
    }
  }

  const cleanedLines = lines.map(sanitizeLine).filter((line) => line.length > 1)

  for (const line of cleanedLines.slice(0, 20)) {
    if (!line) continue
    if (/\b(remote|hybrid|on-?site)\b/i.test(line)) {
      return { city: 'Remote', state: null, country: null }
    }

    const labelMatch = line.match(/(?:location|based in|office)\s*:\s*(.+)/i)
    const candidate = labelMatch?.[1] || line
    const parts = candidate
      .split(',')
      .map((part) => cleanExtractedText(part))
      .filter(Boolean) as string[]

    if (parts.length >= 2 && parts[0].length < 60) {
      return {
        city: parts[0] || null,
        state: parts[1] || null,
        country: parts[2] || null,
      }
    }
  }

  return null
}

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSkills(content: string): string[] {
  const foundSkills = new Set<string>()
  const text = content.toLowerCase()

  // Match exact skills from our list
  for (const skill of COMMON_SKILLS) {
    try {
      const skillLower = skill.toLowerCase()
      const escapedSkill = escapeRegex(skillLower)
      const patterns = [
        new RegExp(`\\b${escapedSkill}\\b`, 'i'),
        new RegExp(`\\b${escapedSkill}(?:\\.js|\\.py|script)\\b`, 'i'),
      ]

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          foundSkills.add(skill)
          break
        }
      }
    } catch (error) {
      // Skip problematic skill regex and continue with others
      console.warn(`Failed to create regex for skill "${skill}":`, error)
      continue
    }
  }

  // Look for skills sections
  const skillsSection = content.match(
    /(?:skills?|technologies?|requirements?):\s*(.+?)(?:\n\n|\n[A-Z])/is
  )
  if (skillsSection) {
    const skillsText = skillsSection[1]
    for (const skill of COMMON_SKILLS) {
      if (skillsText.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.add(skill)
      }
    }
  }

  return Array.from(foundSkills).slice(0, 10) // Limit to 10 skills
}

function extractEmploymentType(text: string): string | null {
  if (text.includes('full-time') || text.includes('full time')) return 'full-time'
  if (text.includes('part-time') || text.includes('part time')) return 'part-time'
  if (text.includes('contract') || text.includes('contractor')) return 'contract'
  if (text.includes('intern') || text.includes('internship')) return 'internship'
  if (text.includes('freelance')) return 'freelance'
  return null
}

function extractDepartment(content: string, lines: string[]): string | null {
  const deptPatterns = [
    /(?:department|team|division):\s*(.+)/i,
    /(engineering|marketing|sales|hr|finance|operations|product|design|data)\s+team/i,
  ]

  for (const pattern of deptPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

function extractSalaryRange(content: string): string | null {
  const salaryPatterns = [
    /\$?(\d{2,3}[,.]?\d{3})\s*[-–]\s*\$?(\d{2,3}[,.]?\d{3})/,
    /salary:\s*\$?(\d{2,3}[,.]?\d{3}(?:\s*[-–]\s*\$?\d{2,3}[,.]?\d{3})?)/i,
    /compensation:\s*\$?(\d{2,3}[,.]?\d{3}(?:\s*[-–]\s*\$?\d{2,3}[,.]?\d{3})?)/i,
  ]

  for (const pattern of salaryPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

function extractPersonName(content: string, lines: string[]): string | null {
  // First line is often the name in resumes
  const firstLine = lines[0]
  if (
    firstLine &&
    firstLine.length < 50 &&
    /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(firstLine) &&
    !firstLine.includes('@') &&
    !firstLine.includes('www.')
  ) {
    return firstLine
  }

  // Look for name patterns
  const namePattern = /name:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  const match = content.match(namePattern)
  if (match) {
    return match[1]
  }

  return null
}

function extractEmail(content: string): string | null {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  const match = content.match(emailPattern)
  return match ? match[0] : null
}

function extractPhone(content: string): string | null {
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  ]

  for (const pattern of phonePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0]
    }
  }

  return null
}

function extractPersonLocation(content: string, lines: string[]): string | null {
  // Look in first few lines for location
  for (const line of lines.slice(0, 5)) {
    const locationMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)/)
    if (locationMatch) {
      return locationMatch[0]
    }
  }

  const locationPattern = /(?:location|address):\s*(.+)/i
  const match = content.match(locationPattern)
  return match ? match[1].trim() : null
}

function extractExperience(content: string, lines: string[]): string | null {
  const expPatterns = [/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i, /experience:\s*(.+?)(?:\n|$)/i]

  for (const pattern of expPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

function extractEducation(content: string, lines: string[]): string | null {
  const eduPatterns = [
    /(bachelor|master|phd|degree|university|college).*?(?:in|of)\s*([^.\n]+)/i,
    /education:\s*(.+?)(?:\n\n|$)/is,
  ]

  for (const pattern of eduPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

function extractCurrentJobTitle(content: string, lines: string[]): string | null {
  const titlePatterns = [
    // Look for current job title patterns in resume
    /(?:current\s+)?(?:position|role|title):\s*(.+)/i,
    /(?:currently|presently)\s+(?:working as|employed as)?\s*(.+)/i,
    /^(.+?)\s*\|\s*[A-Z][a-zA-Z\s&,.-]+\s*\|\s*(?:current|present|\d{4}\s*-\s*(?:present|current))/im,
    /^(.+?)\s*at\s+[A-Z][a-zA-Z\s&,.-]+\s*(?:current|present|\d{4}\s*-\s*(?:present|current))/im,
  ]

  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const title = match[1].trim()
      if (isValidJobTitle(title)) {
        return title
      }
    }
  }

  // Look in work experience section for current roles
  const workSectionMatch = content.match(
    /(?:work\s+experience|professional\s+experience|employment):(.*?)(?:\n\n|education:|skills:|$)/is
  )
  if (workSectionMatch) {
    const workSection = workSectionMatch[1]
    const currentJobMatch = workSection.match(
      /(.+?)\s*(?:\||@|at)\s*[A-Z][a-zA-Z\s&,.-]+\s*.*?(?:present|current|\d{4}\s*-\s*(?:present|current))/im
    )
    if (currentJobMatch && currentJobMatch[1]) {
      const title = currentJobMatch[1].trim()
      if (isValidJobTitle(title)) {
        return title
      }
    }
  }

  return null
}

function extractRecentJobTitles(content: string, lines: string[]): string[] {
  const jobTitles = new Set<string>()

  // Common job title patterns for resumes
  const titlePatterns = [
    /^(.+?(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead|senior|junior|architect|consultant|designer|administrator))\s*(?:\||@|at)/im,
    /(?:^|\n)(.+?(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead|senior|junior|architect|consultant|designer|administrator))\s*[-–]\s*[A-Z]/gm,
  ]

  for (const pattern of titlePatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const title = match[1].trim()
      if (isValidJobTitle(title)) {
        jobTitles.add(title)
      }
    }
  }

  // Look for structured work experience entries
  const workEntries = content.match(
    /(?:^|\n)(.+?)\s*(?:\||@|at)\s*[A-Z][a-zA-Z\s&,.-]+\s*(?:\||•|\n|\d{4})/gm
  )
  if (workEntries) {
    workEntries.forEach((entry) => {
      const titleMatch = entry.match(/(?:^|\n)(.+?)(?:\s*(?:\||@|at))/i)
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim()
        if (isValidJobTitle(title)) {
          jobTitles.add(title)
        }
      }
    })
  }

  return Array.from(jobTitles).slice(0, 5)
}

function isValidJobTitle(title: string): boolean {
  if (!title || title.length < 3 || title.length > 80) return false

  // Filter out common false positives
  const invalidPatterns = [
    /^\d+/, // Starts with number
    /@/, // Contains email
    /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)$/i, // Common words
    /^(experience|education|skills|contact|phone|email|address)$/i, // Resume sections
    /\.(com|org|net|edu|gov)/i, // URLs
  ]

  return !invalidPatterns.some((pattern) => pattern.test(title))
}

// Generate smart resume name suggestions
export function generateResumeNameSuggestions(
  extractedData: ResumeInfo | null,
  fileName: string
): string[] {
  const suggestions: string[] = []

  if (extractedData?.currentJobTitle) {
    // Priority 1: Current job title
    suggestions.push(`${extractedData.currentJobTitle} Resume`)
    if (extractedData.name) {
      suggestions.push(`${extractedData.name} - ${extractedData.currentJobTitle}`)
    }
  }

  if (extractedData?.recentJobTitles && extractedData.recentJobTitles.length > 0) {
    // Priority 2: Recent job titles
    const recentTitle = extractedData.recentJobTitles[0]
    if (!suggestions.some((s) => s.includes(recentTitle))) {
      suggestions.push(`${recentTitle} Resume`)
    }
  }

  // Priority 3: Filename-based suggestion
  if (fileName) {
    const cleanFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    if (!suggestions.some((s) => s.toLowerCase().includes(cleanFileName.toLowerCase()))) {
      suggestions.push(cleanFileName)
    }
  }

  // Priority 4: Name-based suggestion
  if (extractedData?.name) {
    const nameSuggestion = `${extractedData.name} Resume`
    if (!suggestions.includes(nameSuggestion)) {
      suggestions.push(nameSuggestion)
    }
  }

  // Priority 5: Generic fallback
  if (suggestions.length === 0) {
    suggestions.push('Professional Resume')
  }

  return suggestions.slice(0, 3) // Limit to 3 suggestions
}
