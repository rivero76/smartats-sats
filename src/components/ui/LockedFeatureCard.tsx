// Created: 2026-03-01 00:00:00 - Reusable component for features not yet available. Replaces opacity-60 + disabled patterns.
import { Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface LockedFeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  /** 'card' wraps in a full Card. 'row' renders a compact inline row for use inside existing cards. */
  variant?: 'card' | 'row'
  className?: string
}

export const LockedFeatureCard = ({
  icon: Icon,
  title,
  description,
  variant = 'card',
  className = '',
}: LockedFeatureCardProps) => {
  if (variant === 'row') {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 ${className}`}
      >
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Clock className="h-3 w-3" />
            Coming in a future update
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex items-start gap-4 py-6">
        <div className="rounded-md bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-muted-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground/70 pt-1">
            <Clock className="h-3 w-3" />
            Coming in a future update
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
