// Created: 2026-03-01 00:00:00 - Type definitions for LinkedIn scraper service.

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
}

export interface ScrapeRequest {
  url: string
}

export type ScrapeResult =
  | { success: true; profile: LinkedInProfile; scraped_at: string }
  | { success: false; error: string; code: string }
