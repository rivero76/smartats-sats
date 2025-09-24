import React from 'react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Brain, 
  Target,
  Calendar,
  Zap
} from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { ATSAnalysis } from '@/hooks/useATSAnalyses'

interface ATSAnalysisProgressProps {
  analysis: ATSAnalysis
}

const ATSAnalysisProgress = ({ analysis }: ATSAnalysisProgressProps) => {
  const getStatusDetails = (status: string, analysisData?: Record<string, any>) => {
    const startTime = analysisData?.processing_started_at ? new Date(analysisData.processing_started_at) : new Date(analysis.created_at)
    const completedTime = analysisData?.processing_completed_at ? new Date(analysisData.processing_completed_at) : null
    const processingTime = analysisData?.processing_time_ms
    const tokenUsage = analysisData?.token_usage
    const resumeWarnings = analysisData?.resume_warnings || []
    const modelUsed = analysisData?.model_used

    switch (status) {
      case 'completed':
        return {
          badge: <Badge className="bg-green-100 text-green-800 border-green-200">✅ Complete</Badge>,
          title: 'Analysis Complete',
          description: `Finished ${formatDistanceToNow(completedTime || startTime, { addSuffix: true })}`,
          showProgress: true,
          progress: 100,
          details: {
            processingTime,
            tokenUsage,
            modelUsed,
            resumeWarnings
          }
        }
      case 'processing':
        return {
          badge: <Badge className="bg-blue-100 text-blue-800 border-blue-200">⏳ Processing</Badge>,
          title: 'AI Analysis in Progress',
          description: `Started ${formatDistanceToNow(startTime, { addSuffix: true })}`,
          showProgress: true,
          progress: 60,
          details: {
            processingTime,
            tokenUsage,
            modelUsed
          }
        }
      case 'error':
        return {
          badge: <Badge variant="destructive">❌ Error</Badge>,
          title: 'Analysis Failed',
          description: 'Please try running the analysis again',
          showProgress: false,
          progress: 0,
          error: analysisData?.error_details || 'Unknown error occurred',
          details: {
            resumeWarnings
          }
        }
      default:
        return {
          badge: <Badge variant="outline">⏳ Queued</Badge>,
          title: 'Analysis Queued',
          description: `Queued ${formatDistanceToNow(startTime, { addSuffix: true })}`,
          showProgress: true,
          progress: 10,
          details: {}
        }
    }
  }

  const statusInfo = getStatusDetails(analysis.status, analysis.analysis_data)

  const getTimelineSteps = () => {
    const steps = [
      {
        id: 'queued',
        label: 'Analysis Queued',
        icon: Clock,
        completed: true
      },
      {
        id: 'extracting',
        label: 'Extracting Content',
        icon: FileText,
        completed: analysis.status !== 'initial'
      },
      {
        id: 'analyzing',
        label: 'AI Analysis',
        icon: Brain,
        completed: analysis.status === 'completed'
      },
      {
        id: 'results',
        label: 'Results Ready',
        icon: Target,
        completed: analysis.status === 'completed'
      }
    ]

    return steps
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusInfo.badge}
          <div>
            <h4 className="font-medium">{statusInfo.title}</h4>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>
        {analysis.status === 'processing' && (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        )}
      </div>

      {/* Progress Bar */}
      {statusInfo.showProgress && (
        <div className="space-y-2">
          <Progress value={statusInfo.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{statusInfo.progress}% complete</span>
            {statusInfo.details.processingTime && (
              <span>Processed in {Math.round(statusInfo.details.processingTime / 1000)}s</span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-2">
        {getTimelineSteps().map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              step.completed 
                ? 'bg-green-100 text-green-700' 
                : analysis.status === 'processing' && index === 2
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <step.icon className="h-3 w-3" />
              <span>{step.label}</span>
            </div>
            {index < getTimelineSteps().length - 1 && (
              <div className={`h-px w-4 ${step.completed ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Processing Details */}
      {(statusInfo.details.tokenUsage || statusInfo.details.modelUsed || statusInfo.details.resumeWarnings?.length > 0) && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 text-sm">
              {statusInfo.details.modelUsed && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-mono">{statusInfo.details.modelUsed}</span>
                </div>
              )}
              
              {statusInfo.details.tokenUsage && (
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Tokens:</span>
                  <span className="font-mono">
                    {statusInfo.details.tokenUsage.total_tokens?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              )}

              {statusInfo.details.resumeWarnings?.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">Resume Issues:</span>
                  </div>
                  <ul className="ml-6 space-y-1">
                    {statusInfo.details.resumeWarnings.map((warning: string, index: number) => (
                      <li key={index} className="text-orange-700 text-xs">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details */}
      {statusInfo.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800">Analysis Error</p>
              <p className="text-sm text-red-700">{statusInfo.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ATSAnalysisProgress