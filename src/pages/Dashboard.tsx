import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, FileText, BriefcaseIcon, Users, TrendingUp, Clock } from "lucide-react"

const Dashboard = () => {
  const { satsUser } = useAuth();
  
  const stats = [
    {
      title: "Total Resumes",
      value: "0",
      description: "Resumes uploaded and analyzed",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Job Descriptions",
      value: "0", 
      description: "Job postings created",
      icon: BriefcaseIcon,
      color: "text-green-600"
    },
    {
      title: "ATS Analyses",
      value: "0",
      description: "Resume-job matches analyzed",
      icon: BarChart3,
      color: "text-purple-600"
    },
    {
      title: "Match Rate",
      value: "0%",
      description: "Average ATS compatibility",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ]

  const recentActivity = [
    {
      action: "Welcome to Smart ATS!",
      time: "Just now",
      description: "Get started by uploading your first resume or creating a job description."
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {satsUser?.name || 'User'} 👋
        </h1>
        <p className="text-muted-foreground">
          Welcome to your Smart ATS dashboard. Monitor your recruitment activities and optimize your hiring process.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
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
            <div className="grid gap-4 md:grid-cols-2">
              <Button className="h-auto p-4 justify-start" variant="outline">
                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Upload Resume</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Upload and analyze your resume for ATS compatibility
                  </span>
                </div>
              </Button>
              
              <Button className="h-auto p-4 justify-start" variant="outline">
                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center space-x-2">
                    <BriefcaseIcon className="h-4 w-4" />
                    <span className="font-medium">Create Job Description</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Build optimized job descriptions for better matching
                  </span>
                </div>
              </Button>
              
              <Button className="h-auto p-4 justify-start" variant="outline">
                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">Run ATS Analysis</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Analyze resume-job compatibility and get insights
                  </span>
                </div>
              </Button>
              
              <Button className="h-auto p-4 justify-start" variant="outline">
                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">View Reports</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Access detailed analytics and performance metrics
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
            <CardDescription>
              Your latest actions and system updates
            </CardDescription>
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
    </div>
  )
}

export default Dashboard