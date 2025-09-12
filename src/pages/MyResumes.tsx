import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Upload, Eye, Download, Trash2, Plus } from "lucide-react"

const MyResumes = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
          <p className="text-muted-foreground">
            Upload, manage, and optimize your resumes for ATS compatibility.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload New Resume</span>
          </CardTitle>
          <CardDescription>
            Upload your resume in PDF, DOC, or DOCX format for ATS analysis and optimization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Drop your resume here</h3>
            <p className="text-muted-foreground mb-4">
              or click to browse files from your computer
            </p>
            <Button>Select Files</Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resume List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Resumes</CardTitle>
          <CardDescription>
            Manage your uploaded resumes and view ATS compatibility scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No resumes uploaded yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first resume to get started with ATS analysis and optimization.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Your First Resume
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Future Features Preview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Resume Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View formatted resumes with highlighting of ATS-optimized keywords and sections.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Export optimized versions of your resume in multiple formats for different applications.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Trash2 className="h-4 w-4" />
              <span>Version Control</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keep track of different versions of your resume and compare their ATS scores.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MyResumes