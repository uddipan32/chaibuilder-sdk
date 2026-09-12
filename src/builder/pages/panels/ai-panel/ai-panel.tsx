import { Bot } from "lucide-react";
import { lazy } from "react";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { Button } from "~/components/ui/button";
const AiPanelContent = lazy(() => import("./ai-panel-content"));

export const aiPanelId = "chai-chat-panel";
/** Sidebar AI button -- the handoff sparkle's fallback target while the composer isn't mounted yet. */
export const AI_PANEL_SIDEBAR_TRIGGER_ID = "chai-ai-panel-sidebar-trigger";
/** The panel's composer (message + input) -- the sparkle's landing spot when mounted. */
export const AI_PANEL_COMPOSER_ID = "chai-ai-panel-composer";

const AiIcon = ({ className = "" }: { className?: string }) => {
  return <Bot className={className} />;
};

const AiPanelButton = ({ isActive, show }: { isActive: boolean; show: () => void }) => {
  const isAiEnabled = useBuilderProp("flags.ai", false);

  if (!isAiEnabled) {
    return null;
  }

  return (
    <Button
      id={AI_PANEL_SIDEBAR_TRIGGER_ID}
      variant="ghost"
      size="icon"
      onClick={show}
      className={`h-8 w-8 ${isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}`}>
      <AiIcon />
    </Button>
  );
};

export const aiPanel = {
  id: aiPanelId,
  label: "AI Assistant",
  button: AiPanelButton,
  panel: () => (
    <div className="h-full">
      <AiPanelContent />
    </div>
  ),
  position: "top" as const,
};
