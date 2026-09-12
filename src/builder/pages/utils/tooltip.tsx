import { Tooltip as _Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export default function Tooltip({
  children,
  content,
  side = "bottom",
  delayDuration = 700,
  showTooltip = true,
  onClick = () => {},
  align = undefined,
  className = "",
}: {
  children: any;
  content: any;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  showTooltip?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  if (!showTooltip) return children;

  return (
    <TooltipProvider>
      <_Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild onClick={onClick}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className={cn("bg-background", className)}>
          <p>{content}</p>
        </TooltipContent>
      </_Tooltip>
    </TooltipProvider>
  );
}
