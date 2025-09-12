// Pattern-based content extraction utilities (no AI)

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
}

export interface ResumeInfo {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  skills: string[]
  experience: string | null
  education: string | null
}

const COMMON_SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'SQL', 'HTML', 'CSS',
  'AWS', 'Docker', 'Kubernetes', 'Git', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
  'Angular', 'Vue.js', 'Express', 'Spring', 'Django', 'Flask', 'Laravel', 'PHP',
  'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin', 'Ruby', 'Scala', 'R', 'MATLAB',
  'Machine Learning', 'AI', 'Data Science', 'Analytics', 'Tableau', 'Power BI',
  'Figma', 'Sketch', 'Adobe', 'Photoshop', 'Illustrator', 'UI/UX', 'Design',
  'Project Management', 'Agile', 'Scrum', 'JIRA', 'Confluence', 'Slack', 'Teams'
]

export function extractJobDescriptionInfo(content: string): JobInfo {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  const text = content.toLowerCase()
  
  return {
    title: extractJobTitle(content, lines),
    company: extractCompany(content, lines),
    location: extractLocation(content, lines),
    skills: extractSkills(content),
    employmentType: extractEmploymentType(text),
    department: extractDepartment(content, lines),
    salaryRange: extractSalaryRange(content)
  }
}

export function extractResumeInfo(content: string): ResumeInfo {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  
  return {
    name: extractPersonName(content, lines),
    email: extractEmail(content),
    phone: extractPhone(content),
    location: extractPersonLocation(content, lines),
    skills: extractSkills(content),
    experience: extractExperience(content, lines),
    education: extractEducation(content, lines)
  }
}

function extractJobTitle(content: string, lines: string[]): string | null {
  // Look for common job title patterns
  const titlePatterns = [
    /(?:position|role|job\s+title|title):\s*(.+)/i,
    /^(.+(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead|senior|junior))/i,
    /we're\s+(?:looking for|hiring)\s+(?:a|an)\s+(.+)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  // Check first few lines for job titles
  for (const line of lines.slice(0, 5)) {
    if (line.length > 5 && line.length < 80 && 
        (line.includes('Engineer') || line.includes('Developer') || 
         line.includes('Manager') || line.includes('Analyst') ||
         line.includes('Specialist') || line.includes('Director'))) {
      return line
    }
  }
  
  return null
}

function extractCompany(content: string, lines: string[]): string | null {
  const companyPatterns = [
    /(?:company|organization|at|join)\s*:\s*(.+)/i,
    /about\s+([A-Z][a-zA-Z\s&,.-]+)(?:\s+is|\s+was|\s+provides)/i,
    /([A-Z][a-zA-Z\s&,.-]+)\s+is\s+(?:looking|seeking|hiring)/i,
    /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  ]
  
  for (const pattern of companyPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let company = match[1].trim()
      // Clean up common suffixes
      company = company.replace(/\s+(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?)$/i, '')
      if (company.length > 2 && company.length < 50) {
        return company
      }
    }
  }
  
  return null
}

function extractLocation(content: string, lines: string[]): JobInfo['location'] {
  const locationPatterns = [
    /(?:location|based\s+in|office):\s*(.+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)(?:,\s*([A-Z][a-z]+))?/,
    /(remote|hybrid|on-site)/i
  ]
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern)
    if (match) {
      if (match[0].toLowerCase().includes('remote')) {
        return { city: 'Remote', state: null, country: null }
      }
      if (match[3]) { // City, State, Country
        return {
          city: match[1]?.trim() || null,
          state: match[2]?.trim() || null,
          country: match[3]?.trim() || null
        }
      }
      if (match[2]) { // City, State
        return {
          city: match[1]?.trim() || null,
          state: match[2]?.trim() || null,
          country: null
        }
      }
      if (match[1]) {
        const location = match[1].trim()
        const parts = location.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          return {
            city: parts[0] || null,
            state: parts[1] || null,
            country: parts[2] || null
          }
        }
      }
    }
  }
  
  return null
}

function extractSkills(content: string): string[] {
  const foundSkills = new Set<string>()
  const text = content.toLowerCase()
  
  // Match exact skills from our list
  for (const skill of COMMON_SKILLS) {
    const skillLower = skill.toLowerCase()
    const patterns = [
      new RegExp(`\\b${skillLower}\\b`, 'i'),
      new RegExp(`\\b${skillLower}(?:\\.js|\\.py|script)\\b`, 'i')
    ]
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        foundSkills.add(skill)
        break
      }
    }
  }
  
  // Look for skills sections
  const skillsSection = content.match(/(?:skills?|technologies?|requirements?):\s*(.+?)(?:\n\n|\n[A-Z])/is)
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
    /(engineering|marketing|sales|hr|finance|operations|product|design|data)\s+team/i
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
    /compensation:\s*\$?(\d{2,3}[,.]?\d{3}(?:\s*[-–]\s*\$?\d{2,3}[,.]?\d{3})?)/i
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
  if (firstLine && firstLine.length < 50 && 
      /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(firstLine) &&
      !firstLine.includes('@') && !firstLine.includes('www.')) {
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
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
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
  const expPatterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /experience:\s*(.+?)(?:\n|$)/i
  ]
  
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
    /education:\s*(.+?)(?:\n\n|$)/is
  ]
  
  for (const pattern of eduPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }
  
  return null
}