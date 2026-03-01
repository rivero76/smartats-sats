import { describe, expect, it } from 'vitest'
import { extractJobDescriptionInfo } from '@/utils/contentExtraction'

describe('contentExtraction - provider headers', () => {
  it('extracts linkedin LAB3 header correctly', () => {
    const input =
      'LAB3 hiring Project Manager in Auckland, Auckland, New Zealand | LinkedIn\nAbout the job\nLab3 is one of the largest Azure engineering practices...'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('LAB3')
    expect(result.title).toBe('Project Manager')
    expect(result.location?.city).toBe('Auckland')
    expect(result.location?.state).toBe('Auckland')
    expect(result.location?.country).toBe('New Zealand')
    expect(result.extractionMeta?.rules).toContain('linkedin_header')
  })

  it('extracts linkedin Deloitte header correctly', () => {
    const input =
      'Deloitte hiring Project Manager / Programme Manager / Product Manager in Auckland, Auckland, New Zealand | LinkedIn\nAbout the team and role...'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('Deloitte')
    expect(result.title).toBe('Project Manager / Programme Manager / Product Manager')
    expect(result.location?.city).toBe('Auckland')
  })

  it('extracts linkedin The Good Source header correctly', () => {
    const input =
      'The Good Source hiring Product Manager in Auckland, New Zealand | LinkedIn\nRole summary...'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('The Good Source')
    expect(result.title).toBe('Product Manager')
    expect(result.location?.city).toBe('Auckland')
    expect(result.location?.state).toBe('New Zealand')
  })

  it('extracts SEEK style header', () => {
    const input =
      'Project Manager at LAB3 in Auckland, Auckland, New Zealand | SEEK\nAbout the role...'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('LAB3')
    expect(result.title).toBe('Project Manager')
    expect(result.location?.city).toBe('Auckland')
    expect(result.extractionMeta?.rules).toContain('seek_header')
  })

  it('extracts Indeed style header', () => {
    const input =
      'Project Manager - LAB3 - Auckland, New Zealand | Indeed\nAbout the role...'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('LAB3')
    expect(result.title).toBe('Project Manager')
    expect(result.location?.city).toBe('Auckland')
    expect(result.extractionMeta?.rules).toContain('indeed_header')
  })

  it('extracts Workday style header', () => {
    const input = 'Project Manager | LAB3 | Workday\nApply now'
    const result = extractJobDescriptionInfo(input)

    expect(result.company).toBe('LAB3')
    expect(result.title).toBe('Project Manager')
    expect(result.extractionMeta?.rules).toContain('workday_header')
  })
})
