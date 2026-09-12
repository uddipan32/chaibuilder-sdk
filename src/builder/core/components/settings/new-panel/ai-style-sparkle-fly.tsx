import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { AI_PANEL_COMPOSER_ID, AI_PANEL_SIDEBAR_TRIGGER_ID } from "~/builder/pages/panels/ai-panel/ai-panel";

const FLIGHT_DURATION_S = 1.3;
/** Negative = arcs upward before dropping into the composer at the bottom-left. */
const ARC_HEIGHT_PX = -70;

/**
 * A sparkle that flies from the Style panel's prompt box to the AI panel's
 * composer, then fades out. Purely decorative — the handoff happens on submit,
 * not on landing. Falls back to the always-mounted sidebar AI button while the
 * composer's lazy chunk is still loading.
 */
export function AiStyleSparkleFly({ fromRect, onComplete }: { fromRect: DOMRect; onComplete: () => void }) {
  const target =
    document.getElementById(AI_PANEL_COMPOSER_ID) ?? document.getElementById(AI_PANEL_SIDEBAR_TRIGGER_ID);
  const toRect = target?.getBoundingClientRect();

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect ? toRect.left + toRect.width / 2 : 170;
  const toY = toRect ? toRect.top + toRect.height / 2 : window.innerHeight - 110;
  const dx = toX - fromX;
  const dy = toY - fromY;

  return createPortal(
    <motion.div
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
      animate={{
        x: [0, dx * 0.15, dx * 0.5, dx * 0.8, dx],
        y: [0, dy * 0.15 + ARC_HEIGHT_PX * 0.4, dy * 0.5 + ARC_HEIGHT_PX, dy * 0.8 + ARC_HEIGHT_PX * 0.3, dy],
        opacity: [0, 1, 1, 1, 0],
        scale: [0.6, 1.3, 1.1, 1.1, 0.5],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{ duration: FLIGHT_DURATION_S, times: [0, 0.15, 0.5, 0.8, 1], ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      style={{
        position: "fixed",
        left: fromX,
        top: fromY,
        translateX: "-50%",
        translateY: "-50%",
        zIndex: 9999,
        pointerEvents: "none",
      }}>
      <Sparkles className="h-7 w-7 text-primary drop-shadow-[0_0_10px_currentColor]" />
    </motion.div>,
    document.body,
  );
}
