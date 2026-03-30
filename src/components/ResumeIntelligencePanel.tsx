/**
 * UPDATE LOG
 * 2026-03-30 11:00:00 | PROD-9–12: New component — Resume Intelligence Panel. Renders format_audit,
 *   geography_passport, industry_lens, and cultural_tone from analysis_data. Renders null for
 *   pre-feature analyses (backwards compatible).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  Globe,
  Building2,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from 'lucide-react'

interface FormatIssue {
  category: string
  severity: 'critical' | 'warning' | 'info'
  description: string
}

interface FormatAudit {
  overall_health: 'good' | 'fair' | 'poor'
  pass: boolean
  issues: FormatIssue[]
}

interface GeographyPassport {
  detected_country: string
  country_code: string
  detection_method: string
  checklist: {
    photo_expected: boolean
    typical_page_length: string
    personal_details_norm: string
    date_format: string
    notes: string
  }
}

interface IndustryLens {
  vertical: string
  confidence: number
  expected_sections: string[]
  missing_sections: string[]
  notes: string
}

interface CulturalTone {
  detected_register: string
  target_norm: string
  mismatches: string[]
  overall_alignment: 'aligned' | 'minor_mismatch' | 'significant_mismatch'
}

interface ResumeIntelligencePanelProps {
  analysisData: Record<string, any>
}

const DETECTION_METHOD_LABELS: Record<string, string> = {
  user_override: 'User override',
  jd_explicit: 'Detected from JD',
  jd_inferred: 'Inferred from JD',
  hq_signal: 'Company HQ signal',
  unknown: 'Auto-detected',
}

const ALIGNMENT_CONFIG = {
  aligned: { label: 'Aligned', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  minor_mismatch: {
    label: 'Minor mismatch',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  significant_mismatch: {
    label: 'Significant mismatch',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

const HEALTH_CONFIG = {
  good: { label: 'Good', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  fair: { label: 'Fair', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  poor: { label: 'Poor', className: 'bg-red-100 text-red-800 border-red-200' },
}

function SeverityIcon({ severity }: { severity: FormatIssue['severity'] }) {
  if (severity === 'critical')
    return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
  if (severity === 'warning')
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
  return <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
}

function issueBg(severity: FormatIssue['severity']) {
  if (severity === 'critical') return 'bg-red-50 border border-red-100'
  if (severity === 'warning') return 'bg-amber-50 border border-amber-100'
  return 'bg-blue-50 border border-blue-100'
}

const CATEGORY_LABELS: Record<string, string> = {
  table_column: 'Table/column layout',
  emoji_graphic: 'Emoji/graphic',
  section_heading: 'Non-standard heading',
  missing_url: 'Missing URL',
  vague_bullet: 'Vague bullet',
  length_mismatch: 'Length mismatch',
}

export default function ResumeIntelligencePanel({ analysisData }: ResumeIntelligencePanelProps) {
  const formatAudit: FormatAudit | null = analysisData?.format_audit ?? null
  const geographyPassport: GeographyPassport | null = analysisData?.geography_passport ?? null
  const industryLens: IndustryLens | null = analysisData?.industry_lens ?? null
  const culturalTone: CulturalTone | null = analysisData?.cultural_tone ?? null

  // Render nothing for pre-feature analyses
  if (!formatAudit && !geographyPassport && !industryLens && !culturalTone) return null

  const healthConfig = formatAudit ? HEALTH_CONFIG[formatAudit.overall_health] : null

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Resume Intelligence
          </div>
          {healthConfig && (
            <Badge variant="outline" className={`text-xs ${healthConfig.className}`}>
              Format: {healthConfig.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        {/* ── Format Audit (PROD-9) ─────────────────────────── */}
        {formatAudit && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5" />
              Format Audit
            </div>
            {formatAudit.pass && formatAudit.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                Passes ATS format health check — no issues detected.
              </div>
            ) : (
              <div className="space-y-1.5">
                {formatAudit.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${issueBg(issue.severity)}`}
                  >
                    <SeverityIcon severity={issue.severity} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {CATEGORY_LABELS[issue.category] ?? issue.category}:{' '}
                      </span>
                      <span className="text-muted-foreground">{issue.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Geography Passport (PROD-10) ──────────────────── */}
        {geographyPassport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Globe className="h-3.5 w-3.5" />
                Geography Passport
              </div>
              <span className="text-xs text-muted-foreground italic">
                {DETECTION_METHOD_LABELS[geographyPassport.detection_method] ??
                  geographyPassport.detection_method}
              </span>
            </div>
            <div className="bg-muted/40 rounded-md p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{geographyPassport.detected_country}</span>
                <Badge variant="outline" className="text-xs">
                  {geographyPassport.country_code}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {[
                  ['Photo expected', geographyPassport.checklist.photo_expected ? 'Yes' : 'No'],
                  ['Typical length', geographyPassport.checklist.typical_page_length],
                  ['Personal details', geographyPassport.checklist.personal_details_norm],
                  ['Date format', geographyPassport.checklist.date_format],
                ].map(([label, value]) => (
                  <div key={label} className="text-xs">
                    <span className="text-muted-foreground">{label}: </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              {geographyPassport.checklist.notes && (
                <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                  {geographyPassport.checklist.notes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Industry Lens (PROD-11) ───────────────────────── */}
        {industryLens && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" />
              Industry Lens
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 border">
                {industryLens.vertical}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Math.round(industryLens.confidence * 100)}% confidence
              </span>
            </div>
            {industryLens.missing_sections.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Consider adding:</p>
                <div className="flex flex-wrap gap-1.5">
                  {industryLens.missing_sections.map((section) => (
                    <Badge
                      key={section}
                      variant="outline"
                      className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                    >
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {industryLens.notes && (
              <p className="text-xs text-muted-foreground">{industryLens.notes}</p>
            )}
          </div>
        )}

        {/* ── Cultural Tone (PROD-12) ───────────────────────── */}
        {culturalTone && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <MessageSquare className="h-3.5 w-3.5" />
              Cultural Tone
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {culturalTone.detected_register.replace('_', ' ')}
              </Badge>
              {(() => {
                const cfg = ALIGNMENT_CONFIG[culturalTone.overall_alignment]
                return cfg ? (
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                ) : null
              })()}
            </div>
            {culturalTone.target_norm && (
              <div className="text-xs bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-blue-700">
                <span className="font-medium">Target norm: </span>
                {culturalTone.target_norm}
              </div>
            )}
            {culturalTone.mismatches.length > 0 && (
              <div className="space-y-1.5">
                {culturalTone.mismatches.map((mismatch, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-100 rounded-md px-3 py-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-amber-800">{mismatch}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
