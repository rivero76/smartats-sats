// Updated: 2026-03-01 00:00:00 - Added HelpButton and HelpModal for contextual user guide.
// Updated: 2026-03-01 00:00:00 - Added Beta badge to page header to reflect validation status.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ExternalLink, Target, TriangleAlert } from 'lucide-react'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'

type ProactiveMatchRow = {
  id: string
  ats_score: number | null
  status: string
  created_at: string
  missing_skills: unknown
  analysis_data: Record<string, unknown> | null
  job_description: {
    id: string
    name: string
    source_url: string | null
  } | null
}

const ProactiveMatches = () => {
  const { user } = useAuth()
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('proactiveMatches')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['proactive-matches', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data: rows, error: queryError } = await supabase
        .from('sats_analyses')
        .select(
          `
          id,
          ats_score,
          status,
          created_at,
          missing_skills,
          analysis_data,
          job_description:sats_job_descriptions!sats_analyses_jd_id_fkey (
            id,
            name,
            source_url
          )
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('ats_score', 61)
        .not('analysis_data->>staged_job_id', 'is', null)
        .order('ats_score', { ascending: false })
        .order('created_at', { ascending: false })

      if (queryError) throw queryError
      return (rows || []) as ProactiveMatchRow[]
    },
  })

  const matches = useMemo(() => data || [], [data])

  const parseSkills = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v))
    return []
  }

  const scoreBreakdown = (analysisData: Record<string, unknown> | null) => {
    const breakdown = analysisData?.score_breakdown
    if (!breakdown || typeof breakdown !== 'object') return null
    const b = breakdown as Record<string, unknown>
    return {
      skillsAlignment: typeof b.skills_alignment === 'number' ? Math.round(b.skills_alignment * 100) : null,
      experienceRelevance:
        typeof b.experience_relevance === 'number' ? Math.round(b.experience_relevance * 100) : null,
      domainFit: typeof b.domain_fit === 'number' ? Math.round(b.domain_fit * 100) : null,
      formatQuality: typeof b.format_quality === 'number' ? Math.round(b.format_quality * 100) : null,
    }
  }

  return (
    <div className="space-y-6">
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50">
              Beta
            </Badge>
          </div>
          <p className="text-muted-foreground">
            High-match proactive opportunities discovered by the system, ordered by ATS score.
          </p>
        </div>
        {helpContent && (
          <HelpButton
            onClick={() => setShowHelp(true)}
            tooltip="Learn how Proactive Opportunities work"
          />
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx}>
              <CardHeader>
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-9 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              Unable to load opportunities
            </CardTitle>
            <CardDescription>{(error as Error)?.message || 'Unexpected error.'}</CardDescription>
          </CardHeader>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No high-match opportunities yet</CardTitle>
            <CardDescription>
              Opportunities will appear here when proactive scoring finds matches above 60%.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => {
            const missingSkills = parseSkills(match.missing_skills)
            const breakdown = scoreBreakdown(match.analysis_data)
            const score = match.ats_score ?? 0

            return (
              <Card key={match.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{match.job_description?.name || 'Untitled Job'}</CardTitle>
                    <Badge className={score >= 80 ? 'bg-green-600' : 'bg-blue-600'}>
                      <Target className="mr-1 h-3 w-3" />
                      {score}%
                    </Badge>
                  </div>
                  <CardDescription>
                    Found {new Date(match.created_at).toLocaleDateString()} • Threshold: &gt;60%
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {breakdown && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Skills Alignment: {breakdown.skillsAlignment ?? 'N/A'}%</div>
                      <div>Experience: {breakdown.experienceRelevance ?? 'N/A'}%</div>
                      <div>Domain Fit: {breakdown.domainFit ?? 'N/A'}%</div>
                      <div>Format Quality: {breakdown.formatQuality ?? 'N/A'}%</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium mb-2">Missing Skills</div>
                    {missingSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No critical gaps identified.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.slice(0, 8).map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {match.job_description?.source_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={match.job_description.source_url} target="_blank" rel="noreferrer">
                        View Original Posting
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProactiveMatches
