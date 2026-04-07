/**
 * UPDATE LOG
 * 2026-04-07 00:00:00 | P28 S5 — ReconciliationConflictList component. Renders
 *   LinkedIn-vs-resume discrepancies returned by the analyze-profile-fit edge
 *   function. Read-only informational view. Max+ tier only.
 */
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ReconciliationConflict } from '@/hooks/useProfileFit'

const SEVERITY_CONFIG = {
  HIGH: {
    label: 'High',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
    rowClass: 'border-red-200 bg-red-50',
  },
  MEDIUM: {
    label: 'Medium',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-300',
    rowClass: 'border-amber-200 bg-amber-50',
  },
  LOW: {
    label: 'Low',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
    rowClass: 'border-blue-200 bg-blue-50',
  },
}

const FIELD_LABELS: Record<string, string> = {
  job_title: 'Job title',
  company: 'Company name',
  employment_dates: 'Employment dates',
  skill_claim: 'Skill claim',
  years_experience: 'Years of experience',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ')
}

interface ReconciliationConflictListProps {
  conflicts: ReconciliationConflict[]
}

export function ReconciliationConflictList({ conflicts }: ReconciliationConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
        <span>No discrepancies detected between your LinkedIn profile and resume.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {conflicts.map((conflict, idx) => {
        const cfg = SEVERITY_CONFIG[conflict.severity]
        return (
          <div key={idx} className={`rounded-lg border p-4 ${cfg.rowClass}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="font-medium text-sm capitalize">{fieldLabel(conflict.field)}</span>
              </div>
              <Badge className={`text-xs shrink-0 border ${cfg.badgeClass}`}>
                {cfg.label} severity
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-0.5">LinkedIn</p>
                <p className="text-foreground">{conflict.linkedin_value}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-0.5">Resume</p>
                <p className="text-foreground">{conflict.resume_value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
