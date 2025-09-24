import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface HelpButtonProps {
  onClick: () => void
  size?: "sm" | "default" | "lg" | "icon"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  tooltip?: string
  className?: string
}

export const HelpButton = ({ 
  onClick, 
  size = "sm", 
  variant = "ghost", 
  tooltip = "Get help with this feature",
  className = ""
}: HelpButtonProps) => {
  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <HelpCircle className="h-4 w-4" />
      {size !== "icon" && <span className="ml-1">Help</span>}
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}