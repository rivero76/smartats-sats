import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Plus, TrendingUp, Target, AlertCircle, CheckCircle, Calendar, Building, Trash2, Loader2, Settings } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useATSAnalyses, useATSAnalysisStats, useDeleteATSAnalysis } from '@/hooks/useATSAnalyses'
import ATSAnalysisModal from '@/components/ATSAnalysisModal'
import N8NTestModal from '@/components/N8NTestModal'
import { formatDistanceToNow } from 'date-fns'

const ATSAnalyses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isN8NModalOpen, setIsN8NModalOpen] = useState(false)
  const { data: analyses, isLoading: analysesLoading } = useATSAnalyses()
  const { data: stats, isLoading: statsLoading } = useATSAnalysisStats()
  const deleteAnalysis = useDeleteATSAnalysis()

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Queued</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ATS Analyses</h1>
          <p className="text-muted-foreground">
            Analyze resume-job compatibility and get detailed insights to improve match rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsN8NModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Test N8N
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Analysis Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          [
            {
              title: "Total Analyses",
              value: stats?.totalAnalyses.toString() || "0",
              description: "Resume-job matches analyzed",
              icon: BarChart3,
              color: "text-blue-600"
            },
            {
              title: "Average Score",
              value: `${stats?.averageScore || 0}%`,
              description: "ATS compatibility rate",
              icon: TrendingUp,
              color: "text-green-600"
            },
            {
              title: "High Matches",
              value: stats?.highMatches.toString() || "0",
              description: "Scores above 80%",
              icon: CheckCircle,
              color: "text-emerald-600"
            },
            {
              title: "Need Improvement",
              value: stats?.needImprovement.toString() || "0",
              description: "Scores below 60%",
              icon: AlertCircle,
              color: "text-orange-600"
            }
          ].map((stat, index) => (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Analyses</CardTitle>
          <CardDescription>
            View and manage your ATS analyses and their results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : !analyses || analyses.length === 0 ? (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No analyses completed yet</h3>
              <p className="text-muted-foreground mb-4">
                Run your first ATS analysis to see how well your resume matches job requirements.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Start Your First Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="p-6 border rounded-lg space-y-4">
                  {/* Analysis Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{analysis.resume?.name}</h3>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{analysis.job_description?.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                        </div>
                        {analysis.job_description?.company?.name && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {analysis.job_description.company.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(analysis.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnalysis.mutate(analysis.id)}
                        disabled={deleteAnalysis.isPending}
                      >
                        {deleteAnalysis.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {analysis.status === 'complete' && analysis.ats_score !== null ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">ATS Compatibility Score</span>
                        <span className={`text-2xl font-bold ${getScoreColor(analysis.ats_score)}`}>
                          {analysis.ats_score}%
                        </span>
                      </div>
                      <Progress value={analysis.ats_score} className="h-2" />
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Matched Skills */}
                        {analysis.matched_skills.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Matched Skills</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.matched_skills.slice(0, 6).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                                  {skill}
                                </Badge>
                              ))}
                              {analysis.matched_skills.length > 6 && (
                                <Badge variant="outline">
                                  +{analysis.matched_skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Missing Skills */}
                        {analysis.missing_skills.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium">Missing Skills</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {analysis.missing_skills.slice(0, 6).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                                  {skill}
                                </Badge>
                              ))}
                              {analysis.missing_skills.length > 6 && (
                                <Badge variant="outline">
                                  +{analysis.missing_skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggestions */}
                      {analysis.suggestions && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">💡 AI Suggestions</p>
                          <p className="text-sm text-muted-foreground">{analysis.suggestions}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button className="w-full" disabled>
                        Add Missing Experience (Coming Soon)
                      </Button>
                    </div>
                   ) : analysis.status === 'processing' ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">
                          Processing analysis via N8N workflow...
                        </span>
                      </div>
                    </div>
                  ) : analysis.status === 'error' ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        Analysis failed to process. Please try running it again.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">Analysis queued for processing...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      <ATSAnalysisModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      
      {/* N8N Test Modal */}
      <N8NTestModal open={isN8NModalOpen} onOpenChange={setIsN8NModalOpen} />
    </div>
  )
}

export default ATSAnalyses