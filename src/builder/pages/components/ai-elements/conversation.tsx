"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "~/utils/vendor/use-stick-to-bottom";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 min-h-0 overflow-y-hidden", className)}
    initial="smooth"
    resize="auto"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content className={cn("flex flex-col gap-8 p-4", className)} {...props} />
);

// HTMLAttributes rather than ComponentProps<"div">: this component doesn't
// forward refs, and excluding `ref` avoids the @types/react duplicate-version
// mismatch that previously forced a cast on the spread.
export type ConversationEmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn("flex size-full flex-col items-center justify-center gap-3 px-3 py-12 text-center", className)}
    {...props}>
    {children ?? (
      <>
        {icon && <div className="text-foreground/70">{icon}</div>}
        <div className="space-y-1">
          <div className="text-sm text-foreground">{title}</div>
          {description && <p className="text-xs font-light text-foreground/50">{description}</p>}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({ className, ...props }: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn("absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full", className)}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}>
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
