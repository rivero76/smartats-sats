import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Plus, TrendingUp, Target, AlertCircle, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const ATSAnalyses = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ATS Analyses</h1>
          <p className="text-muted-foreground">
            Analyze resume-job compatibility and get detailed insights to improve match rates.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Analysis
        </Button>
      </div>

      {/* Analysis Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Analyses",
            value: "0",
            description: "Resume-job matches analyzed",
            icon: BarChart3,
            color: "text-blue-600"
          },
          {
            title: "Average Score",
            value: "0%",
            description: "ATS compatibility rate",
            icon: TrendingUp,
            color: "text-green-600"
          },
          {
            title: "High Matches",
            value: "0",
            description: "Scores above 80%",
            icon: CheckCircle,
            color: "text-emerald-600"
          },
          {
            title: "Need Improvement",
            value: "0",
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
        ))}
      </div>

      {/* Sample Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sample ATS Analysis</CardTitle>
          <CardDescription>
            Here's what a completed ATS analysis will look like once you upload resumes and job descriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">RESUME</h4>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Software Engineer Resume</h3>
                <p className="text-sm text-muted-foreground">John_Doe_Resume.pdf</p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">JOB DESCRIPTION</h4>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Senior Software Engineer</h3>
                <p className="text-sm text-muted-foreground">Tech Company Inc.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">COMPATIBILITY SCORE</h4>
              <span className="text-2xl font-bold text-green-600">85%</span>
            </div>
            <Progress value={85} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Excellent match! This resume is highly compatible with the job requirements.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Keywords Match</span>
              </div>
              <div className="text-2xl font-bold text-green-600">92%</div>
              <p className="text-xs text-muted-foreground">18 of 20 key terms found</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Skills Match</span>
              </div>
              <div className="text-2xl font-bold text-green-600">88%</div>
              <p className="text-xs text-muted-foreground">15 of 17 skills matched</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Experience</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">75%</div>
              <p className="text-xs text-muted-foreground">5 years vs 7 required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Analyses</CardTitle>
          <CardDescription>
            View and manage your completed ATS analyses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No analyses completed yet</h3>
            <p className="text-muted-foreground mb-4">
              Run your first ATS analysis to see how well your resume matches job requirements.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Start Your First Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ATSAnalyses