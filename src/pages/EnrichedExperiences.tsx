import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sparkles, Plus, Lightbulb, Zap, Star, Wand2, Construction, AlertTriangle } from "lucide-react"

const EnrichedExperiences = () => {
  return (
    <div className="space-y-6">
      {/* Development Status Warning */}
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <Construction className="h-4 w-4" />
        <AlertTitle>Feature Under Development</AlertTitle>
        <AlertDescription>
          The Experience Enrichment feature is currently being developed and is not yet functional. 
          We're working hard to bring you AI-powered resume enhancement capabilities. 
          Please check back soon for updates on this exciting new feature.
        </AlertDescription>
      </Alert>

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
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Enrich Experience
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Feature coming soon - currently under development</p>
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
              Get intelligent suggestions to improve your experience descriptions with action verbs and quantifiable achievements.
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
              Transform vague descriptions into specific, measurable accomplishments that ATS systems and recruiters love.
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
              Automatically incorporate relevant industry keywords and skills to improve ATS compatibility.
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
                  <li>• Architected and developed 5 high-traffic web applications using React, Node.js, and PostgreSQL, serving 100K+ daily active users</li>
                  <li>• Reduced production bugs by 40% through implementation of comprehensive testing strategies and code review processes</li>
                  <li>• Led cross-functional team of 6 developers, designers, and QA engineers to deliver features 25% faster than industry average</li>
                  <li>• Optimized application performance using Python, JavaScript, and AWS cloud services, improving load times by 60%</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-700 mb-2">✨ AI Enhancement Highlights</h4>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div>
                <span className="font-medium">Keywords Added:</span>
                <span className="text-blue-600"> React, Node.js, PostgreSQL, Python, JavaScript, AWS</span>
              </div>
              <div>
                <span className="font-medium">Metrics Added:</span>
                <span className="text-blue-600"> 100K+ users, 40% reduction, 25% faster, 60% improvement</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Enriched Experiences */}
      <Card>
        <CardHeader>
          <CardTitle>Your Enriched Experiences</CardTitle>
          <CardDescription>
            Manage and track your AI-enhanced work experiences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No experiences enriched yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload a resume or manually add work experiences to start the AI enhancement process.
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Start Enriching Your Experiences
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Feature coming soon - currently under development</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
                step: "1",
                title: "Input Experience",
                description: "Provide your basic job description and responsibilities"
              },
              {
                step: "2", 
                title: "AI Analysis",
                description: "Our AI analyzes your content for improvement opportunities"
              },
              {
                step: "3",
                title: "Enhancement",
                description: "Generate enhanced descriptions with metrics and keywords"
              },
              {
                step: "4",
                title: "Review & Apply",
                description: "Review suggestions and apply the best enhancements"
              }
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
    </div>
  )
}

export default EnrichedExperiences