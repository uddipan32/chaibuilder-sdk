"use client";

import { motion } from "motion/react";
import { type CSSProperties, type ElementType, memo, useMemo } from "react";
import { cn } from "~/lib/utils";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  /** "muted" (default) for passive states like reasoning; "primary" for the AI actively mutating the page. */
  tone?: "muted" | "primary";
};

const motionComponents = {
  p: motion.p,
  span: motion.span,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
} as const;

type MotionComponentKey = keyof typeof motionComponents;

const ShimmerComponent = ({ children, as = "p", className, duration = 2, spread = 2, tone = "muted" }: TextShimmerProps) => {
  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);

  const componentKey = (typeof as === "string" && as in motionComponents ? as : "p") as MotionComponentKey;
  const MotionComponent = motionComponents[componentKey];

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-surface),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            tone === "primary"
              ? "var(--bg), linear-gradient(var(--color-primary), var(--color-primary))"
              : "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
      }}>
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
