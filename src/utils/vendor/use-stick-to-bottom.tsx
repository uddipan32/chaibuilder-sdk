"use client";

/**
 * Auto-scroll container that keeps itself pinned to the bottom while new
 * content streams in, unless the user scrolls up. Internal replacement for
 * the `use-stick-to-bottom` package (MIT,
 * https://github.com/stackblitz-labs/use-stick-to-bottom), covering the
 * subset we use: <StickToBottom>, <StickToBottom.Content>, and
 * useStickToBottomContext().
 */

import * as React from "react";
import { cn } from "~/lib/utils";

// Generous on purpose: a single transient layout shift (e.g. content growing
// during early mount/streaming) that pushes the gap past this once is enough
// to permanently flip isAtBottomRef to false -- nothing else resets it -- so
// this needs real headroom against jitter, not just "visually at the bottom".
const AT_BOTTOM_THRESHOLD_PX = 150;

interface StickToBottomContextValue {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isAtBottomRef: React.RefObject<boolean>;
}

const StickToBottomContext = React.createContext<StickToBottomContextValue | null>(null);

export function useStickToBottomContext() {
  const context = React.useContext(StickToBottomContext);
  if (!context) {
    throw new Error("useStickToBottomContext must be used within a StickToBottom component");
  }
  return context;
}

type ScrollBehaviorOption = "smooth" | "instant" | "auto";

export interface StickToBottomProps extends React.ComponentProps<"div"> {
  /** Scroll position behavior on mount. */
  initial?: ScrollBehaviorOption | boolean;
  /** Scroll behavior when content resizes while pinned to the bottom. */
  resize?: ScrollBehaviorOption;
}

function StickToBottomRoot({ initial = "smooth", resize = "smooth", children, className, ...props }: StickToBottomProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const isAtBottomRef = React.useRef(true);
  const resizeBehaviorRef = React.useRef<ScrollBehaviorOption>(resize);
  resizeBehaviorRef.current = resize;

  const scrollToBottom = React.useCallback((behavior: ScrollBehaviorOption = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: behavior === "instant" ? ("instant" as ScrollBehavior) : behavior });
  }, []);

  // Track whether the user is at the bottom of the scroll container
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_THRESHOLD_PX;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Keep pinned to the bottom while the content grows
  React.useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!isAtBottomRef.current) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: resizeBehaviorRef.current === "instant" ? ("instant" as ScrollBehavior) : resizeBehaviorRef.current,
      });
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Initial scroll position
  React.useEffect(() => {
    if (initial === false) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: initial === true || initial === "smooth" ? "auto" : "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = React.useMemo(
    () => ({ isAtBottom, scrollToBottom: () => scrollToBottom("smooth"), scrollRef, contentRef, isAtBottomRef }),
    [isAtBottom, scrollToBottom],
  );

  return (
    <StickToBottomContext.Provider value={contextValue}>
      {/* The caller's className carries two different concerns that both need
          the SAME class list, on two different elements: layout classes
          (flex-1, min-h-0, ...) that must land on this outer div -- the
          actual flex child of the surrounding layout -- or it stops growing
          to fill available space; and scroll-region classes (no-scrollbar,
          ...) that only take effect on the inner div below, which is the one
          that actually has overflow-y-auto and is where a native scrollbar
          renders. role/data-testid/etc. go on the inner div only, since it's
          the element that's semantically "the log" -- putting them on both
          would make e.g. data-testid ambiguous. */}
      <div className={cn("relative", className)}>
        {/* className goes LAST here so its own overflow-y and position
            utilities (if any -- e.g. the caller's overflow-y-hidden meant for
            the outer wrapper above, or "relative" from that same shared
            className) never win the cn()/tailwind-merge conflict against
            these hardcoded values. overflow-y-auto must always win here or
            scrolling is silently disabled; static must always win here or an
            absolutely-positioned child (e.g. a floating scroll-to-bottom
            button) anchors to this SCROLLING div instead of the outer static
            one, and scrolls away with the content instead of staying put. */}
        <div
          ref={scrollRef}
          {...props}
          className={cn("h-full w-full overflow-y-auto", className, "static overflow-y-auto")}>
          {children}
        </div>
      </div>
    </StickToBottomContext.Provider>
  );
}

export type StickToBottomContentProps = React.ComponentProps<"div">;

function StickToBottomContent(props: StickToBottomContentProps) {
  const { contentRef } = useStickToBottomContext();
  return <div ref={contentRef} {...props} />;
}

export const StickToBottom = Object.assign(StickToBottomRoot, { Content: StickToBottomContent });
