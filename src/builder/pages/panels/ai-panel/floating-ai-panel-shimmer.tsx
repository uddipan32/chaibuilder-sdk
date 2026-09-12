import { startTransition, useEffect, useState } from "react";

export function FloatingAiPanelShimmer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(20vw, 90vh)`,
        zIndex: 50,
      }}
      className="bg-surface/95 flex w-[400px] animate-pulse flex-col overflow-hidden rounded-xl border border-border shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 p-3">
        <div className="flex items-center gap-2">
          {/* Icon skeleton */}
          <div className="h-8 w-8 rounded-full bg-muted" />
          {/* Text skeleton */}
          <div className="ml-2 h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          {/* Grip and Chevron skeletons */}
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-6 w-6 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
