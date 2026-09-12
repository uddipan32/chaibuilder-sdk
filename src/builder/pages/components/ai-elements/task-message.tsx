"use client";

import { HTMLAttributes } from "react";
import { cn } from "~/lib/utils";
import { Shimmer } from "./shimmer";

export type TaskMessageProps = HTMLAttributes<HTMLDivElement> & {
  content: string;
  isLoading?: boolean;
  /** "primary" (default) for the AI actively working a task; "muted" for a passive wait (e.g. waiting on the model). */
  tone?: "muted" | "primary";
};

export const TaskMessage = ({ className, content, isLoading = false, tone = "primary", ...props }: TaskMessageProps) => {
  const isPrimary = isLoading && tone === "primary";
  return (
    <div className={cn("is-assistant flex w-full max-w-[94%] flex-col gap-2", className)} {...props}>
      <div className="flex w-fit flex-col gap-2 overflow-hidden text-sm">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-3 transition-colors",
            isPrimary ? "border-primary/30 bg-primary/5" : "border-muted-foreground/20 bg-muted/50",
          )}>
          <div className="flex flex-1 items-center gap-2">
            {isLoading && (
              <Shimmer duration={1.5} tone={tone} className="text-xs">
                {content}
              </Shimmer>
            )}
            {!isLoading && <div className="text-xs text-foreground/80">{content}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
