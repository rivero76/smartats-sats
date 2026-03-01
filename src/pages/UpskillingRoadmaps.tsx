/**
 * UPDATE LOG
 * 2026-02-25 16:55:00 | P15 Story 3: Added upskilling roadmap dashboard with milestone completion tracking.
 * 2026-03-01 00:00:00 | Added HelpButton and HelpModal for contextual user guide.
 * 2026-03-01 00:00:00 | Added Beta badge to page header to reflect validation status.
 */
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap, RefreshCw } from 'lucide-react'
import UpskillingRoadmap from '@/components/UpskillingRoadmap'
import {
  useLearningRoadmaps,
  useRoadmapMilestones,
  useToggleRoadmapMilestone,
} from '@/hooks/useUpskillingRoadmaps'
import { HelpButton } from '@/components/help/HelpButton'
import { HelpModal } from '@/components/help/HelpModal'
import { getHelpContent } from '@/data/helpContent'

const UpskillingRoadmaps = () => {
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null)
  const [pendingMilestoneId, setPendingMilestoneId] = useState<string | undefined>(undefined)
  const [showHelp, setShowHelp] = useState(false)
  const helpContent = getHelpContent('upskillingRoadmaps')

  const { data: roadmaps, isLoading: roadmapsLoading, refetch: refetchRoadmaps } = useLearningRoadmaps()
  const roadmapIds = useMemo(() => roadmaps?.map((roadmap) => roadmap.id) || [], [roadmaps])

  const {
    data: milestones,
    isLoading: milestonesLoading,
    refetch: refetchMilestones,
  } = useRoadmapMilestones(roadmapIds)
  const toggleMilestone = useToggleRoadmapMilestone()

  useEffect(() => {
    if (!roadmaps || roadmaps.length === 0) {
      setSelectedRoadmapId(null)
      return
    }

    if (!selectedRoadmapId || !roadmaps.some((roadmap) => roadmap.id === selectedRoadmapId)) {
      setSelectedRoadmapId(roadmaps[0].id)
    }
  }, [roadmaps, selectedRoadmapId])

  const selectedRoadmap = useMemo(
    () => roadmaps?.find((roadmap) => roadmap.id === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId]
  )

  const selectedMilestones = useMemo(
    () =>
      (milestones || [])
        .filter((milestone) => milestone.roadmap_id === selectedRoadmapId)
        .sort((a, b) => a.order_index - b.order_index),
    [milestones, selectedRoadmapId]
  )

  const isLoading = roadmapsLoading || milestonesLoading

  const handleToggleMilestone = async (milestoneId: string, checked: boolean) => {
    setPendingMilestoneId(milestoneId)
    try {
      await toggleMilestone.mutateAsync({ milestoneId, isCompleted: checked })
    } finally {
      setPendingMilestoneId(undefined)
    }
  }

  const handleRefresh = async () => {
    await Promise.all([refetchRoadmaps(), refetchMilestones()])
  }

  return (
    <div className="space-y-6">
      {helpContent && (
        <HelpModal open={showHelp} onOpenChange={setShowHelp} content={helpContent} />
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Upskilling Roadmaps</h1>
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50">
              Beta
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Track your milestone completion and close role-specific skill gaps over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {helpContent && (
            <HelpButton
              onClick={() => setShowHelp(true)}
              tooltip="Learn how to use Upskilling Roadmaps"
            />
          )}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !roadmaps || roadmaps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Roadmaps Yet</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Generate your first roadmap from an ATS analysis to get a sequenced learning timeline
              with progress tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roadmaps.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select a roadmap</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {roadmaps.map((roadmap) => (
                  <Button
                    key={roadmap.id}
                    variant={selectedRoadmapId === roadmap.id ? 'default' : 'outline'}
                    onClick={() => setSelectedRoadmapId(roadmap.id)}
                  >
                    {roadmap.target_role}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {selectedRoadmap ? (
            <UpskillingRoadmap
              roadmap={selectedRoadmap}
              milestones={selectedMilestones}
              pendingMilestoneId={pendingMilestoneId}
              onToggleMilestone={handleToggleMilestone}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

export default UpskillingRoadmaps
