import { ChevronDownIcon } from "@radix-ui/react-icons";
import { includes, map, toUpper } from "lodash-es";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getBreakpointValue } from "~/builder/core/functions/common-functions";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useCanvasDisplayWidth, useScreenSizeWidth } from "~/builder/hooks/use-screen-size-width";
import { useSelectedBreakpoints } from "~/builder/hooks/use-selected-breakpoints";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";

export interface BreakpointItemType {
  breakpoint: string;
  content: string;
  icon: any;
  title: string;
  width: number;
}

export interface BreakpointCardProps extends BreakpointItemType {
  canvas?: boolean;
  currentBreakpoint: string;
  onClick: (width: number) => void;
  openDelay?: number;
  tooltip?: boolean;
  buttonClass?: string;
  activeButtonClass?: string;
}

export const WEB_BREAKPOINTS: BreakpointItemType[] = [
  {
    title: "Mobile (Base)",
    content: "Styles set here are applied to all screen unless edited at higher breakpoint",
    breakpoint: "xs",
    icon: <Smartphone />,
    width: 400,
  },
  {
    title: "Mobile landscape (SM)",
    content: "Styles set here are applied at 640px and up unless edited at higher breakpoint",
    breakpoint: "sm",
    icon: <Smartphone className="rotate-90" />,
    width: 640,
  },
  {
    title: "Tablet (MD)",
    content: "Styles set here are applied at 768px and up",
    breakpoint: "md",
    icon: <Tablet />,
    width: 800,
  },
  {
    title: "Tablet Landscape (LG)",
    content: "Styles set here are applied at 1024px and up unless edited at higher breakpoint",
    breakpoint: "lg",
    icon: <Tablet className="rotate-90" />,
    width: 1024,
  },
  {
    title: "Desktop (XL)",
    content: "Styles set here are applied at 1280px and up unless edited at higher breakpoint",
    breakpoint: "xl",
    icon: <Laptop />,
    width: 1420,
  },
  {
    title: "Large Desktop (2XL)",
    content: "Styles set here are applied at 1536px and up",
    breakpoint: "2xl",
    icon: <Monitor />,
    width: 1920,
  },
];

const BreakpointCard = ({
  openDelay = 400,
  tooltip = true,
  title,
  currentBreakpoint,
  breakpoint,
  width,
  icon,
  content = "",
  onClick,
}: BreakpointCardProps) => {
  const { t } = useTranslation();
  const isActive = breakpoint === currentBreakpoint;

  if (!tooltip) {
    return (
      <Button onClick={() => onClick(width)} size="icon-sm" variant={isActive ? "outline" : "ghost"}>
        {icon}
      </Button>
    );
  }

  return (
    <HoverCard openDelay={openDelay}>
      <HoverCardTrigger asChild>
        <Button
          onClick={() => onClick(width)}
          size="icon-sm"
          variant="ghost"
          className={`border-none text-foreground shadow-none hover:bg-accent ${isActive ? "bg-accent" : ""}`}>
          {icon}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-auto max-w-52">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold">{t(title)}</h4>
          <p className="text-xs text-muted-foreground">{t(content)}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const Breakpoints = ({
  openDelay = 400,
  canvas = false,
  tooltip = true,
  buttonClass = "",
  activeButtonClass = "",
}: {
  openDelay?: number;
  canvas?: boolean;
  tooltip?: boolean;
  buttonClass?: string;
  activeButtonClass?: string;
}) => {
  const [currentWidth, , setNewWidth] = useScreenSizeWidth();
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useCanvasDisplayWidth();
  const [styleBreakpoints, setStyleBreakpoints] = useSelectedBreakpoints();

  const selectedBreakpoints = canvas ? styleBreakpoints : styleBreakpoints;
  const setSelectedBreakpoints = canvas ? setStyleBreakpoints : setStyleBreakpoints;
  const { t } = useTranslation();
  const breakpoints = useBuilderProp("breakpoints", WEB_BREAKPOINTS);

  const toggleBreakpoint = (newBreakPoint: string) => {
    if (selectedBreakpoints.includes(newBreakPoint)) {
      if (selectedBreakpoints.length > 2) {
        setSelectedBreakpoints(selectedBreakpoints.filter((bp) => bp !== newBreakPoint));
      }
    } else {
      setSelectedBreakpoints((prevSelected: string[]) => [...prevSelected, newBreakPoint]);
    }
  };

  const handleCanvasWidthChange = (width: number) => {
    if (canvas) {
      setCanvasDisplayWidth(width);
    } else {
      setNewWidth(width);
      setCanvasDisplayWidth(width);
    }
  };

  const breakpoint = getBreakpointValue(canvas ? canvasDisplayWidth : currentWidth).toLowerCase();

  if (breakpoints.length < 4) {
    return (
      <div className="flex items-center rounded-md">
        {map(breakpoints, (bp) => (
          <BreakpointCard
            canvas={canvas}
            {...bp}
            onClick={handleCanvasWidthChange}
            key={bp.breakpoint}
            currentBreakpoint={breakpoint}
            activeButtonClass="bg-gray-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-px">
        {map(
          breakpoints.filter((bp: BreakpointItemType) => includes(selectedBreakpoints, toUpper(bp.breakpoint))),
          (bp: BreakpointItemType) => (
            <BreakpointCard
              canvas={canvas}
              openDelay={openDelay}
              tooltip={tooltip}
              {...bp}
              onClick={handleCanvasWidthChange}
              key={bp.breakpoint}
              currentBreakpoint={breakpoint}
              buttonClass={buttonClass}
              activeButtonClass={activeButtonClass}
            />
          ),
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" className="mx-px h-6 w-6 outline-none">
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{t("Screen sizes")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {map(breakpoints, (bp: BreakpointItemType) => (
            <DropdownMenuCheckboxItem
              key={bp.breakpoint}
              disabled={bp.breakpoint === "xs"}
              onCheckedChange={() => toggleBreakpoint(toUpper(bp.breakpoint))}
              checked={includes(selectedBreakpoints, toUpper(bp.breakpoint))}
              onSelect={(event) => event.preventDefault()}>
              {t(bp.title)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
