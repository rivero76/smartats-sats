import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck,
  Users,
  Activity,
  Database,
  Settings,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { LoggingControlPanel } from '@/components/admin/LoggingControlPanel'

const AdminDashboard = () => {
  const systemStats = [
    {
      title: 'Total Users',
      value: '1,234',
      description: 'Active registered users',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Analyses Today',
      value: '89',
      description: 'ATS analyses completed',
      icon: Activity,
      color: 'text-green-600',
    },
    {
      title: 'Storage Used',
      value: '67%',
      description: 'Database storage capacity',
      icon: Database,
      color: 'text-purple-600',
    },
    {
      title: 'System Alerts',
      value: '3',
      description: 'Requiring attention',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
  ]

  const recentActivity = [
    {
      user: 'john.doe@example.com',
      action: 'Uploaded resume',
      time: '2 minutes ago',
      type: 'success',
    },
    {
      user: 'jane.smith@company.com',
      action: 'Completed ATS analysis',
      time: '5 minutes ago',
      type: 'info',
    },
    {
      user: 'mike.johnson@startup.io',
      action: 'Created job description',
      time: '12 minutes ago',
      type: 'success',
    },
    {
      user: 'System',
      action: 'Database backup completed',
      time: '1 hour ago',
      type: 'info',
    },
    {
      user: 'sarah.wilson@hr.com',
      action: 'Failed login attempt',
      time: '2 hours ago',
      type: 'warning',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system performance, user activity, and manage Smart ATS platform.
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          System Settings
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logging" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logging Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {systemStats.map((stat, index) => (
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Activity */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest user actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div
                        className={`flex h-2 w-2 rounded-full mt-2 ${
                          activity.type === 'success'
                            ? 'bg-green-500'
                            : activity.type === 'warning'
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                        }`}
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm">
                          <span className="font-medium text-primary">{activity.user}</span>
                          <span className="text-muted-foreground"> {activity.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span className="text-green-600">Normal (23%)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="text-yellow-600">Moderate (67%)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Response Time</span>
                    <span className="text-green-600">Excellent (120ms)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">
                      All Systems Operational
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>User Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View, edit, and manage user accounts and permissions.
                </p>
                <Button variant="outline" className="w-full">
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <span>Database Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor database performance and manage data storage.
                </p>
                <Button variant="outline" className="w-full">
                  View Database
                </Button>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span>Analytics & Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate detailed reports on system usage and performance.
                </p>
                <Button variant="outline" className="w-full">
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>System Alerts</span>
              </CardTitle>
              <CardDescription>
                Important notifications requiring administrative attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-800">Storage Warning</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Database storage is at 67% capacity. Consider upgrading or archiving old data.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Manage Storage
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Scheduled Maintenance</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      System maintenance scheduled for this Sunday at 2:00 AM UTC (4 hours).
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <Users className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800">User Limit Approaching</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Current user count (1,234) is approaching the plan limit (1,500).
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logging">
          <LoggingControlPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard
