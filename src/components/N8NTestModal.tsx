import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Loader2, Network, ExternalLink } from 'lucide-react'
import { useN8NWebhook } from '@/hooks/useN8NWebhook'

interface N8NTestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const N8NTestModal = ({ open, onOpenChange }: N8NTestModalProps) => {
  const { webhookUrl, setWebhookUrl, validateWebhookUrl, testConnectivity, testWebhook, isLoading } = useN8NWebhook()
  const [editUrl, setEditUrl] = useState(webhookUrl)
  const [connectivityResult, setConnectivityResult] = useState<any>(null)
  const [payloadResult, setPayloadResult] = useState<any>(null)
  const [isUrlValid, setIsUrlValid] = useState(true)

  useEffect(() => {
    setEditUrl(webhookUrl)
  }, [webhookUrl])

  useEffect(() => {
    setIsUrlValid(validateWebhookUrl(editUrl))
  }, [editUrl, validateWebhookUrl])

  const handleSaveUrl = () => {
    if (isUrlValid) {
      setWebhookUrl(editUrl)
      setConnectivityResult(null)
      setPayloadResult(null)
    }
  }

  const handleConnectivityTest = async () => {
    try {
      const result = await testConnectivity.mutateAsync(editUrl)
      setConnectivityResult(result)
    } catch (error) {
      console.error('Connectivity test error:', error)
      setConnectivityResult({ 
        success: false, 
        error: (error as Error).message,
        _debug: {
          url: editUrl,
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  const handlePayloadTest = async () => {
    try {
      const result = await testWebhook.mutateAsync(editUrl)
      setPayloadResult(result)
    } catch (error) {
      console.error('Payload test error:', error)
      setPayloadResult({ 
        success: false, 
        error: (error as Error).message,
        _debug: {
          url: editUrl,
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            N8N Webhook Configuration
          </DialogTitle>
          <DialogDescription>
            Configure and test the N8N webhook integration for ATS analysis processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Webhook URL Configuration */}
          <div className="space-y-3">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="space-y-2">
              <Input
                id="webhook-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com/webhook/..."
                className={!isUrlValid ? 'border-destructive' : ''}
              />
              {!isUrlValid && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Invalid webhook URL format
                </div>
              )}
              {editUrl !== webhookUrl && isUrlValid && (
                <Button 
                  onClick={handleSaveUrl}
                  size="sm"
                  className="w-full"
                >
                  Save URL
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Test Sections */}
          <div className="space-y-6">
            {/* Test 1: Connectivity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Test #1: Connectivity Check</Label>
                <Button
                  onClick={handleConnectivityTest}
                  disabled={!isUrlValid || isLoading}
                  size="sm"
                  variant="outline"
                >
                  {testConnectivity.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Test Connectivity'
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Verify that the webhook endpoint is reachable from Lovable.dev
              </p>

              {/* Connectivity Results */}
              {connectivityResult && (
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    {connectivityResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Connectivity OK</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Connection Failed</span>
                      </>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    {connectivityResult.success ? (
                      <div>
                        <div><strong>Status:</strong> {connectivityResult.status}</div>
                        <div><strong>Message:</strong> {connectivityResult.message}</div>
                      </div>
                    ) : (
                      <div className="text-destructive">
                        <strong>Error:</strong> {connectivityResult.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Test 2: Full Payload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Test #2: Full Payload Test</Label>
                <Button
                  onClick={handlePayloadTest}
                  disabled={!isUrlValid || isLoading}
                  size="sm"
                >
                  {testWebhook.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Payload'
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Send a complete test payload and verify N8N processes it correctly
              </p>

              {/* Payload Results */}
              {payloadResult && (
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    {payloadResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Payload Test Successful</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Payload Test Failed</span>
                      </>
                    )}
                  </div>
                  
                  {payloadResult.success ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>N8N Response received:</strong>
                      </div>
                      {payloadResult.ats_score && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Score: {payloadResult.ats_score}%</Badge>
                        </div>
                      )}
                      {payloadResult.matched_skills && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Matched Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {payloadResult.matched_skills.slice(0, 5).map((skill: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {payloadResult.message && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Message:</strong> {payloadResult.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-destructive">
                      <strong>Error:</strong> {payloadResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Webhook Documentation */}
          <div className="space-y-3">
            <Label>Expected Payload Format</Label>
            <Textarea
              readOnly
              value={JSON.stringify({
                analysis_id: "string",
                user_id: "string",
                resume_data: {
                  id: "string",
                  name: "string",
                  content: "string (optional)"
                },
                job_description_data: {
                  id: "string",
                  name: "string",
                  content: "string (optional)",
                  company: { id: "string", name: "string" },
                  location: { id: "string", name: "string" }
                },
                timestamp: "ISO string",
                request_id: "string"
              }, null, 2)}
              className="font-mono text-xs h-32"
            />
          </div>

          <div className="space-y-3">
            <Label>Expected Response Format</Label>
            <Textarea
              readOnly
              value={JSON.stringify({
                success: true,
                analysis_id: "string",
                ats_score: 85,
                matched_skills: ["React", "JavaScript", "Node.js"],
                missing_skills: ["TypeScript", "AWS"],
                suggestions: "Consider adding TypeScript experience..."
              }, null, 2)}
              className="font-mono text-xs h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            onClick={() => window.open('https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/', '_blank')}
            variant="secondary"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            N8N Docs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default N8NTestModal