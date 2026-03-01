import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Search, ArrowRight } from 'lucide-react'
import { helpContentData, type HelpContent } from '@/data/helpContent'

// Updated: 2026-03-01 00:00:00 - Added route mappings for Enriched Experiences, Upskilling Roadmaps, and Proactive Matches
const HELP_ROUTE_MAP: Record<string, string> = {
  dashboard: '/',
  resumes: '/resumes',
  jobDescriptions: '/jobs',
  atsAnalysis: '/analyses',
  profileSettings: '/settings',
  enrichedExperiences: '/experiences',
  upskillingRoadmaps: '/roadmaps',
  proactiveMatches: '/opportunities',
}

type HelpTopic = HelpContent & { route?: string }

const HelpHub = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const topics = useMemo<HelpTopic[]>(
    () =>
      Object.values(helpContentData).map((topic) => ({
        ...topic,
        route: HELP_ROUTE_MAP[topic.id],
      })),
    []
  )

  const filteredTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return topics

    return topics.filter((topic) => {
      const haystack = [
        topic.title,
        topic.description,
        topic.overview,
        ...(topic.keyFeatures || []),
        ...(topic.relatedTopics || []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [query, topics])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Help Hub</h1>
        <p className="text-muted-foreground">
          Find guides, troubleshooting tips, and workflow instructions for every major feature.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Search Help Topics
          </CardTitle>
          <CardDescription>
            Search by feature, workflow, or keyword. Open a topic to continue on the related page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help topics (e.g. ATS score, missing skills, upload resume)"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredTopics.map((topic) => (
          <Card key={topic.id} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              <CardDescription>{topic.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-sm text-muted-foreground">{topic.overview}</p>

              {topic.keyFeatures && topic.keyFeatures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topic.keyFeatures.slice(0, 4).map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-auto">
                <Button
                  variant={topic.route ? 'default' : 'secondary'}
                  className="w-full justify-between"
                  onClick={() => topic.route && navigate(topic.route)}
                  disabled={!topic.route}
                >
                  {topic.route ? 'Open Related Page' : 'Topic Available In Contextual Help'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No help topics match your search. Try broader terms like <code>resume</code>,{' '}
            <code>analysis</code>, or <code>settings</code>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default HelpHub
