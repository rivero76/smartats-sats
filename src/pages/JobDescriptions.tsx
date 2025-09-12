import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BriefcaseIcon, Plus, Search, Filter, Building, MapPin, DollarSign } from "lucide-react"
import { Input } from "@/components/ui/input"

const JobDescriptions = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Descriptions</h1>
          <p className="text-muted-foreground">
            Create, manage, and optimize job descriptions for better candidate matching.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Job Description
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search job descriptions..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job Description Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>
            Use pre-built templates to create optimized job descriptions faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Software Engineer",
                description: "Full-stack development role template",
                category: "Technology"
              },
              {
                title: "Product Manager",
                description: "Product management position template",
                category: "Product"
              },
              {
                title: "Marketing Manager",
                description: "Digital marketing role template",
                category: "Marketing"
              },
              {
                title: "Data Scientist",
                description: "Analytics and ML position template",
                category: "Technology"
              },
              {
                title: "Sales Representative",
                description: "Business development role template",
                category: "Sales"
              },
              {
                title: "UX Designer",
                description: "User experience design template",
                category: "Design"
              }
            ].map((template, index) => (
              <Card key={index} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <Button size="sm" variant="outline">
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Descriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Job Descriptions</CardTitle>
          <CardDescription>
            Manage your created job descriptions and track their performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No job descriptions created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first job description to start attracting the right candidates.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Job Description
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Company Branding</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Customize job descriptions with your company branding and culture.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Location Targeting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set location preferences and remote work options for better targeting.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Salary Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get salary recommendations based on market data and role requirements.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default JobDescriptions