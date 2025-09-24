import { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle, Info } from "lucide-react"

interface HelpTooltipProps {
  children: ReactNode
  content: string
  side?: "top" | "right" | "bottom" | "left"
  showIcon?: boolean
  iconType?: "help" | "info"
  className?: string
}

export const HelpTooltip = ({ 
  children, 
  content, 
  side = "top", 
  showIcon = true, 
  iconType = "help",
  className = ""
}: HelpTooltipProps) => {
  const IconComponent = iconType === "help" ? HelpCircle : Info

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center space-x-1 ${className}`}>
            {children}
            {showIcon && (
              <IconComponent className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}