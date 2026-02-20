import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import type { HelpContent, HelpStep, TroubleshootingItem } from '@/data/helpContent'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: HelpContent
}

export const HelpModal = ({ open, onOpenChange, content }: HelpModalProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const StepComponent = ({ step, index }: { step: HelpStep; index: number }) => (
    <div className="flex space-x-3 p-4 border rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>
      <div className="flex-1 space-y-2">
        <h4 className="font-medium">{step.title}</h4>
        <p className="text-sm text-muted-foreground">{step.description}</p>
        {step.tip && (
          <div className="flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">{step.tip}</p>
          </div>
        )}
      </div>
    </div>
  )

  const TroubleshootingComponent = ({ item }: { item: TroubleshootingItem }) => (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-start space-x-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">{item.problem}</h4>
          <p className="text-xs text-muted-foreground mt-1">{item.solution}</p>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>{content.title}</span>
          </DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Overview Section */}
            <Collapsible
              open={expandedSections.has('overview')}
              onOpenChange={() => toggleSection('overview')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Overview</h3>
                  </div>
                  {expandedSections.has('overview') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <p className="text-muted-foreground">{content.overview}</p>

                {content.keyFeatures && content.keyFeatures.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Features:</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {content.keyFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Step-by-Step Guide */}
            {content.steps && content.steps.length > 0 && (
              <>
                <Collapsible
                  open={expandedSections.has('steps')}
                  onOpenChange={() => toggleSection('steps')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <h3 className="text-lg font-semibold">Step-by-Step Guide</h3>
                      </div>
                      {expandedSections.has('steps') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {content.steps.map((step, index) => (
                      <StepComponent key={index} step={step} index={index} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
              </>
            )}

            {/* Best Practices */}
            {content.bestPractices && content.bestPractices.length > 0 && (
              <>
                <Collapsible
                  open={expandedSections.has('practices')}
                  onOpenChange={() => toggleSection('practices')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <h3 className="text-lg font-semibold">Best Practices</h3>
                      </div>
                      {expandedSections.has('practices') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-4">
                    {content.bestPractices.map((practice, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-300">{practice}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
                <Separator />
              </>
            )}

            {/* Troubleshooting */}
            {content.troubleshooting && content.troubleshooting.length > 0 && (
              <Collapsible
                open={expandedSections.has('troubleshooting')}
                onOpenChange={() => toggleSection('troubleshooting')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold">Troubleshooting</h3>
                    </div>
                    {expandedSections.has('troubleshooting') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-4">
                  {content.troubleshooting.map((item, index) => (
                    <TroubleshootingComponent key={index} item={item} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Related Topics */}
            {content.relatedTopics && content.relatedTopics.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Related Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {content.relatedTopics.map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
