import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Plus, Lightbulb, Zap, Star, Wand2, AlertTriangle, Copy } from 'lucide-react'
import { useEnrichedExperiences } from '@/hooks/useEnrichedExperiences'
import { EnrichExperienceModal } from '@/components/EnrichExperienceModal'
import { useToast } from '@/hooks/use-toast'

const statusStyles: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline'
  }
> = {
  accepted: { label: 'Accepted', variant: 'default' },
  edited: { label: 'Edited', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'outline' },
  pending: { label: 'Pending', variant: 'outline' },
}

const EnrichedExperiences = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: experiences, isLoading } = useEnrichedExperiences()
  const { toast } = useToast()

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied to clipboard',
        description: 'Suggestion text copied successfully.',
      })
    } catch (error) {
      console.error('Failed to copy suggestion', error)
      toast({
        variant: 'destructive',
        title: 'Unable to copy',
        description: 'Please copy the text manually.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enriched Experiences</h1>
          <p className="text-muted-foreground">
            Enhance your resume experiences with AI-powered suggestions and optimizations.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Enrich Experience
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate and approve AI-powered experience bullets</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Feature Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <span>AI Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get intelligent suggestions to improve your experience descriptions with action verbs
              and quantifiable achievements.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>Impact Quantification</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Transform vague descriptions into specific, measurable accomplishments that ATS
              systems and recruiters love.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-purple-600" />
              <span>Keyword Optimization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically incorporate relevant industry keywords and skills to improve ATS
              compatibility.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sample Enrichment Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-green-600" />
            <span>Experience Enrichment Example</span>
          </CardTitle>
          <CardDescription>
            See how AI enhancement transforms basic job descriptions into compelling achievements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Before */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <h4 className="font-medium text-red-700">Before Enhancement</h4>
              </div>
              <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                <h3 className="font-medium mb-2">Software Engineer</h3>
                <p className="text-sm text-muted-foreground mb-2">TechCorp (2020-2023)</p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Worked on web applications</li>
                  <li>• Fixed bugs and implemented features</li>
                  <li>• Collaborated with team members</li>
                  <li>• Used various programming languages</li>
                </ul>
              </div>
            </div>

            {/* After */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h4 className="font-medium text-green-700">After Enhancement</h4>
              </div>
              <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                <h3 className="font-medium mb-2">Senior Software Engineer</h3>
                <p className="text-sm text-muted-foreground mb-2">TechCorp (2020-2023)</p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>
                    • Architected and developed 5 high-traffic web applications using React,
                    Node.js, and PostgreSQL, serving 100K+ daily active users
                  </li>
                  <li>
                    • Reduced production bugs by 40% through implementation of comprehensive testing
                    strategies and code review processes
                  </li>
                  <li>
                    • Led cross-functional team of 6 developers, designers, and QA engineers to
                    deliver features 25% faster than industry average
                  </li>
                  <li>
                    • Optimized application performance using Python, JavaScript, and AWS cloud
                    services, improving load times by 60%
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-700 mb-2">✨ AI Enhancement Highlights</h4>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div>
                <span className="font-medium">Keywords Added:</span>
                <span className="text-blue-600">
                  {' '}
                  React, Node.js, PostgreSQL, Python, JavaScript, AWS
                </span>
              </div>
              <div>
                <span className="font-medium">Metrics Added:</span>
                <span className="text-blue-600">
                  {' '}
                  100K+ users, 40% reduction, 25% faster, 60% improvement
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Enriched Experiences */}
      <Card>
        <CardHeader>
          <CardTitle>Your Enriched Experiences</CardTitle>
          <CardDescription>Manage and track your AI-enhanced work experiences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-3 border rounded-lg p-4">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : experiences && experiences.length > 0 ? (
            <div className="space-y-4">
              {experiences.map((experience) => {
                const status = statusStyles[experience.user_action] || statusStyles.pending
                return (
                  <Card key={experience.id} className="border shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-lg">{experience.skill_name}</CardTitle>
                        <CardDescription>
                          {experience.resume?.name || 'Resume'} ·{' '}
                          {experience.job?.name || 'Job Description'}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {experience.suggestion}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {experience.confidence_score !== null &&
                          experience.confidence_score !== undefined && (
                            <span>
                              Confidence {(experience.confidence_score * 100).toFixed(0)}%
                            </span>
                          )}
                        {experience.explanation && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            {experience.explanation}
                          </span>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {experience.skill_type}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleCopy(experience.suggestion)}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Copy text
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center space-y-4 bg-muted/20">
              <Sparkles className="h-10 w-10 mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-medium mb-2">No experiences enriched yet</h3>
                <p className="text-muted-foreground text-sm">
                  Upload a resume and run an ATS analysis. Then generate enrichments to build your
                  personal RAG repository.
                </p>
              </div>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Start Enriching Your Experiences
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhancement Process */}
      <Card>
        <CardHeader>
          <CardTitle>How Experience Enrichment Works</CardTitle>
          <CardDescription>
            Our AI-powered process to transform your experiences into compelling achievements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Input Experience',
                description: 'Provide your basic job description and responsibilities',
              },
              {
                step: '2',
                title: 'AI Analysis',
                description: 'Our AI analyzes your content for improvement opportunities',
              },
              {
                step: '3',
                title: 'Enhancement',
                description: 'Generate enhanced descriptions with metrics and keywords',
              },
              {
                step: '4',
                title: 'Review & Apply',
                description: 'Review suggestions and apply the best enhancements',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mb-2 mx-auto">
                  {item.step}
                </div>
                <h4 className="font-medium mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EnrichExperienceModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}

export default EnrichedExperiences
