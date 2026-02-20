import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  FileText,
  BriefcaseIcon,
  Users,
  TrendingUp,
  Clock,
  Target,
  CheckCircle,
  Clock4,
} from 'lucide-react'
import { useResumes } from '@/hooks/useResumes'
import { useJobDescriptions } from '@/hooks/useJobDescriptions'
import { useATSAnalyses, useATSAnalysisStats } from '@/hooks/useATSAnalyses'
import { useMemo, useState } from 'react'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'
import { HelpTooltip } from '@/components/help/HelpTooltip'

const Dashboard = () => {
  const { satsUser } = useAuth()
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('dashboard')

  // Fetch data using existing hooks
  const { data: resumes, isLoading: resumesLoading } = useResumes()
  const { data: jobDescriptions, isLoading: jobsLoading } = useJobDescriptions()
  const { data: analyses, isLoading: analysesLoading } = useATSAnalyses()
  const { data: analysisStats, isLoading: statsLoading } = useATSAnalysisStats()

  // Calculate dynamic stats
  const stats = useMemo(
    () => [
      {
        title: 'Total Resumes',
        value: resumesLoading ? '...' : (resumes?.length || 0).toString(),
        description: 'Resumes uploaded and analyzed',
        icon: FileText,
        color: 'text-blue-600',
        loading: resumesLoading,
      },
      {
        title: 'Job Descriptions',
        value: jobsLoading ? '...' : (jobDescriptions?.length || 0).toString(),
        description: 'Job postings created',
        icon: BriefcaseIcon,
        color: 'text-green-600',
        loading: jobsLoading,
      },
      {
        title: 'ATS Analyses',
        value: analysesLoading ? '...' : (analysisStats?.totalAnalyses || 0).toString(),
        description: 'Resume-job matches analyzed',
        icon: BarChart3,
        color: 'text-purple-600',
        loading: analysesLoading,
      },
      {
        title: 'Match Rate',
        value: statsLoading ? '...' : `${analysisStats?.averageScore || 0}%`,
        description: 'Average ATS compatibility',
        icon: TrendingUp,
        color: 'text-orange-600',
        loading: statsLoading,
      },
    ],
    [
      resumes,
      jobDescriptions,
      analysisStats,
      resumesLoading,
      jobsLoading,
      analysesLoading,
      statsLoading,
    ]
  )

  // Generate recent activity from actual data
  const recentActivity = useMemo(() => {
    if (analysesLoading || !analyses) {
      return [
        {
          action: 'Welcome to Smart ATS!',
          time: 'Just now',
          description: 'Get started by uploading your first resume or creating a job description.',
        },
      ]
    }

    if (analyses.length === 0) {
      return [
        {
          action: 'Welcome to Smart ATS!',
          time: 'Just now',
          description: 'Get started by uploading your first resume or creating a job description.',
        },
      ]
    }

    // Show recent analyses
    return analyses.slice(0, 3).map((analysis) => ({
      action: `ATS Analysis ${analysis.status === 'completed' ? 'Completed' : 'Processing'}`,
      time: new Date(analysis.created_at).toLocaleDateString(),
      description: `Resume "${analysis.resume?.name}" analyzed against "${analysis.job_description?.name}"${analysis.ats_score ? ` - Score: ${analysis.ats_score}%` : ''}`,
    }))
  }, [analyses, analysesLoading])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {satsUser?.name || 'User'} 👋
          </h1>
          <p className="text-muted-foreground">
            Welcome to your Smart ATS dashboard. Monitor your recruitment activities and optimize
            your hiring process.
          </p>
        </div>
        {helpContent && (
          <HelpButton
            onClick={() => setShowHelp(true)}
            tooltip="Learn how to use your dashboard effectively"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <HelpTooltip
                content={
                  stat.title === 'Total Resumes'
                    ? "Number of resumes you've uploaded and can use for ATS analysis"
                    : stat.title === 'Job Descriptions'
                      ? "Number of job postings you've created for matching against resumes"
                      : stat.title === 'ATS Analyses'
                        ? "Total number of resume-job compatibility analyses you've run"
                        : stat.title === 'Match Rate'
                          ? 'Average compatibility score across all your analyses - higher is better'
                          : stat.description
                }
              >
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              </HelpTooltip>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick Actions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with common tasks to optimize your recruitment process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 overflow-hidden">
              <Button
                className="h-auto p-4 justify-start"
                variant="outline"
                onClick={() => navigate('/resumes')}
              >
                <div className="flex flex-col items-start space-y-1 w-full min-w-0">
                  <div className="flex items-center space-x-2 w-full">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">Manage Resumes</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Upload and manage your resume collection
                  </span>
                </div>
              </Button>

              <Button
                className="h-auto p-4 justify-start"
                variant="outline"
                onClick={() => navigate('/jobs')}
              >
                <div className="flex flex-col items-start space-y-1 w-full min-w-0">
                  <div className="flex items-center space-x-2 w-full">
                    <BriefcaseIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">Job Descriptions</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Create and manage job descriptions
                  </span>
                </div>
              </Button>

              <Button
                className="h-auto p-4 justify-start"
                variant="outline"
                onClick={() => navigate('/analyses')}
              >
                <div className="flex flex-col items-start space-y-1 w-full min-w-0">
                  <div className="flex items-center space-x-2 w-full">
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">ATS Analysis</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Analyze resume-job compatibility
                  </span>
                </div>
              </Button>

              <Button
                className="h-auto p-4 justify-start opacity-60 cursor-not-allowed relative"
                variant="outline"
                disabled
              >
                <div className="flex flex-col items-start space-y-1 w-full min-w-0">
                  <div className="flex items-center space-x-2 w-full">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">Advanced Reports</span>
                  </div>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded self-start">
                    Coming Soon
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Detailed analytics and performance metrics
                  </span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
          <CardDescription>
            Learn about Smart ATS objectives, current capabilities, and future enhancements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* System Objectives */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">System Objectives</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Streamline recruitment processes</li>
                <li>• Improve ATS compatibility scores</li>
                <li>• Provide data-driven hiring insights</li>
                <li>• Optimize resume-job matching</li>
              </ul>
            </div>

            {/* Working Features */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold">Working Features</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Resume Upload & Management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Job Description Creation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>ATS Compatibility Analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>User Profile Management</span>
                </li>
              </ul>
            </div>

            {/* Future Features */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock4 className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold">Future Features</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Clock4 className="h-3 w-3 text-orange-600" />
                  <span>Advanced Analytics Dashboard</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock4 className="h-3 w-3 text-orange-600" />
                  <span>AI-Powered Experience Enhancement</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock4 className="h-3 w-3 text-orange-600" />
                  <span>Email Notifications System</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock4 className="h-3 w-3 text-orange-600" />
                  <span>Data Export/Import Tools</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Modal */}
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
    </div>
  )
}

export default Dashboard
