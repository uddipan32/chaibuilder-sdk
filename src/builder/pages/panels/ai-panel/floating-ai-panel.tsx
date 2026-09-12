import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { animate, motion, useDragControls, useMotionValue } from "motion/react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { MagicAiIcon } from "./magic-ai-icon";

export function FloatingAiPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();
  const dragControls = useDragControls();

  const isAiEnabled = useBuilderProp("flags.ai", false);
  const [mounted, setMounted] = useState(false);

  // Motion values for precise position control
  // Default position: bottom 1/4 on the left side
  const x = useMotionValue(typeof window !== "undefined" ? 50 : 0);
  const y = useMotionValue(typeof window !== "undefined" ? window.innerHeight * 0.9 : 0);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
    const startY = windowSize.height * 0.9;
    const startX = windowSize.width * 0.2;
    y.set(startY);
    x.set(startX);
  }, [y, x, windowSize.height, windowSize.width]);

  const prevExpandedRef = useRef(isExpanded);

  useEffect(() => {
    if (!mounted) return;

    const currentY = y.get();
    const currentX = x.get();

    const expandedHeight = Math.min(500, windowSize.height - 40);
    const collapsedHeight = 70;
    const height = isExpanded ? expandedHeight : collapsedHeight;
    const width = Math.min(300, windowSize.width - 40);

    let newY = currentY;
    const wasExpanded = prevExpandedRef.current;
    prevExpandedRef.current = isExpanded;

    // When collapsing: anchor the bottom edge by shifting y down by the height difference
    if (wasExpanded && !isExpanded) {
      newY = currentY + (expandedHeight - collapsedHeight);
    }

    let newX = currentX;

    // Clamp to viewport boundaries
    if (newY + height > windowSize.height) {
      newY = windowSize.height - height - 20;
    }
    if (newY < 0) newY = 20;

    if (currentX + width > windowSize.width) {
      newX = windowSize.width - width - 20;
    }
    if (newX < 0) newX = 20;

    // Smoothly spring to new position if needed
    if (newY !== currentY) {
      animate(y, newY, { type: "spring", stiffness: 300, damping: 30 });
    }
    if (newX !== currentX) {
      animate(x, newX, { type: "spring", stiffness: 300, damping: 30 });
    }
  }, [isExpanded, mounted, x, y, windowSize.height, windowSize.width]);

  useEffect(() => {
    if (!mounted) return;
    const unsub = pubsub.subscribe(CHAI_BUILDER_EVENTS.OPEN_AI_PANEL, () => {
      setIsExpanded(true);
    });
    return () => unsub();
  }, [mounted]);

  if (!isAiEnabled || !mounted) {
    return null;
  }

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={{
        left: 0,
        right: windowSize.width - (windowSize.width < 340 ? windowSize.width - 40 : 300),
        top: 0,
        bottom: windowSize.height - (isExpanded ? Math.min(500, windowSize.height - 40) : 70),
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x,
        y,
        zIndex: 50,
      }}
      id="floating-ai-panel"
      className={`bg-surface/95 flex w-full max-w-[300px] flex-col overflow-hidden rounded-xl border border-border shadow-md backdrop-blur-md transition-[height,opacity] duration-300 ease-in-out ${isExpanded ? "h-[500px]" : "h-auto"}`}>
      {/* Header / Drag Handle */}
      <div
        className="flex cursor-grab touch-none select-none items-center justify-between border-b border-border bg-secondary/30 p-3 active:cursor-grabbing"
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        onPointerDown={(e) => dragControls.start(e, { snapToCursor: false })}>
        <div className="flex items-center gap-2">
          <MagicAiIcon className="pointer-events-none h-8 w-8" />
          <span className="pointer-events-none text-sm font-medium">{t("AI Assistant")}</span>
        </div>
        <div className="flex items-center gap-2">
          <GripVertical className="pointer-events-none h-4 w-4 text-muted-foreground" />
          <button
            type="button"
            className="cursor-pointer rounded-sm p-1 transition-colors hover:bg-secondary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? t("Collapse AI panel") : t("Expand AI panel")}
            aria-expanded={isExpanded}>
            {isExpanded ? (
              <ChevronDown className="pointer-events-none h-4 w-4" />
            ) : (
              <ChevronUp className="pointer-events-none h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden p-3 transition-opacity duration-300 ${isExpanded ? "visible opacity-100" : "invisible hidden opacity-0"}`}></div>
    </motion.div>
  );
}
