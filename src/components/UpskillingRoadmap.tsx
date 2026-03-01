/**
 * UPDATE LOG
 * 2026-02-25 16:55:00 | P15 Story 3: Added sequenced roadmap timeline with completion toggles and progress bar.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { BookOpen, FolderKanban, MessageSquareWarning, Loader2 } from 'lucide-react'
import { LearningRoadmap, RoadmapMilestone } from '@/hooks/useUpskillingRoadmaps'

interface UpskillingRoadmapProps {
  roadmap: LearningRoadmap
  milestones: RoadmapMilestone[]
  pendingMilestoneId?: string
  onToggleMilestone: (milestoneId: string, checked: boolean) => void
}

const MILESTONE_TYPE_STYLES: Record<
  RoadmapMilestone['milestone_type'],
  {
    label: string
    icon: typeof BookOpen
    className: string
  }
> = {
  course: {
    label: 'Course',
    icon: BookOpen,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  project: {
    label: 'Project',
    icon: FolderKanban,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  interview_prep: {
    label: 'Interview Prep',
    icon: MessageSquareWarning,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
}

export default function UpskillingRoadmap({
  roadmap,
  milestones,
  pendingMilestoneId,
  onToggleMilestone,
}: UpskillingRoadmapProps) {
  const completedCount = milestones.filter((milestone) => milestone.is_completed).length
  const totalCount = milestones.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{roadmap.target_role}</CardTitle>
            <CardDescription>
              Created {new Date(roadmap.created_at).toLocaleDateString()} • {completedCount}/
              {totalCount} milestones complete
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit capitalize">
            {roadmap.status}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Roadmap Progress</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No milestones yet. Generate a roadmap from an ATS analysis with missing skills.
          </p>
        ) : (
          <ol className="space-y-4">
            {milestones.map((milestone) => {
              const style = MILESTONE_TYPE_STYLES[milestone.milestone_type]
              const Icon = style.icon
              const isPending = pendingMilestoneId === milestone.id
              return (
                <li
                  key={milestone.id}
                  className="flex items-start gap-3 rounded-lg border bg-background p-4"
                >
                  <Checkbox
                    checked={milestone.is_completed}
                    disabled={isPending}
                    onCheckedChange={(checked) => onToggleMilestone(milestone.id, checked === true)}
                    className="mt-1"
                    aria-label={`Mark milestone ${milestone.order_index} as complete`}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Step {milestone.order_index}</Badge>
                      <Badge variant="outline" className={style.className}>
                        <Icon className="mr-1 h-3 w-3" />
                        {style.label}
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">
                        Skill: {milestone.skill_name}
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${
                        milestone.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}
                    >
                      {milestone.description}
                    </p>
                  </div>
                  {isPending && (
                    <Button variant="ghost" size="icon" disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
