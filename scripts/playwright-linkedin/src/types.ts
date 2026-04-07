// Created: 2026-03-01 00:00:00 - Type definitions for LinkedIn scraper service.
// Updated: 2026-04-07 00:00:00 - P28 S7 — Add certifications and recommendation_count fields to LinkedInProfile.

export interface LinkedInCertification {
  name: string
  issuing_org: string
  issued_date?: string
}

export interface LinkedInExperience {
  title: string
  company: string
  location?: string
  start_date?: string
  end_date?: string | null
  description: string
  skills_used?: string[]
}

export interface LinkedInProfile {
  full_name: string
  headline: string
  location: string
  summary: string
  skills: string[]
  experiences: LinkedInExperience[]
  certifications?: LinkedInCertification[]
  recommendation_count?: number
}

export interface ScrapeRequest {
  url: string
}

export type ScrapeResult =
  | { success: true; profile: LinkedInProfile; scraped_at: string }
  | { success: false; error: string; code: string }
