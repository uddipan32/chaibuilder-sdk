import { ArrowRight, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useSidebarActivePanel } from "~/builder/hooks/use-sidebar-active-panel";
import { useSearchParams } from "~/builder/pages/hooks/utils/use-search-params";
import { AIConfigProvider } from "~/builder/pages/panels/ai-panel/ai-models-context";
import { aiPanelId } from "~/builder/pages/panels/ai-panel/ai-panel";
import { ModelSelectorDropdown } from "~/builder/pages/panels/ai-panel/model-selector-dropdown";
import { usePendingAiPrompt } from "~/builder/pages/panels/ai-panel/pending-ai-prompt";
import { useSelectedAiModel } from "~/builder/pages/panels/ai-panel/use-selected-ai-model";
import { Button } from "~/components/ui/button";
import { AiStyleSparkleFly } from "./ai-style-sparkle-fly";
import PanelItemWithAccordion from "./panel-item-with-accordion";

/** Hidden from the chat bubble -- see PendingAiPrompt.content. Asks (instead of
 * silently dropping) when part of the request isn't styling, so the user always
 * gets a visible response to it. */
const STYLE_ONLY_INSTRUCTION =
  "\n\n[This request came from the Style panel: you may only modify this block's CSS classes / styling attributes (colors, spacing, typography, layout, etc), and only this block. If any part of the request asks for something else -- different text content, attributes, structure, or another block -- do not make that part of the change without asking first. Apply the styling part, then briefly tell the user what you skipped and ask if they'd like you to also make that change (which would need to happen outside this styling-only scope).]";

// useAIModels() needs an AIConfigProvider ancestor, which the Style panel's
// part of the tree doesn't have -- provide our own.
export function AiStylePrompt() {
  return (
    <AIConfigProvider>
      <AiStylePromptInner />
    </AIConfigProvider>
  );
}

function AiStylePromptInner() {
  const { t } = useTranslation();
  const isAiEnabled = useBuilderProp("flags.ai", false);
  const [input, setInput] = useState("");
  const [, setActivePanel] = useSidebarActivePanel();
  const [, setPendingAiPrompt] = usePendingAiPrompt();
  const selectedBlock = useSelectedBlock();
  const containerRef = useRef<HTMLDivElement>(null);
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);
  const [selectedModel, handleModelChange] = useSelectedAiModel();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("page");

  if (!isAiEnabled) return null;

  // Hands off immediately -- the sparkle flight is purely decorative, so an
  // unmount mid-flight can't lose the prompt.
  const send = () => {
    const prompt = input.trim();
    if (!prompt || !selectedBlock || !selectedModel) return;
    setPendingAiPrompt({
      prompt,
      content: `${prompt}${STYLE_ONLY_INSTRUCTION}`,
      blockId: selectedBlock._id,
      model: selectedModel,
      pageId,
    });
    setActivePanel(aiPanelId);
    if (containerRef.current) setFlyFromRect(containerRef.current.getBoundingClientRect());
    setInput("");
  };

  return (
    <PanelItemWithAccordion value="ask-ai" defaultOpen itemClassName="border-0" leftLabel={t("Ask AI")}>
      <div ref={containerRef} className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("Ask AI to style this block...")}
            className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 py-0 text-xs text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={send}
            disabled={!input.trim()}
            className="h-7 w-7 shrink-0"
            title={t("Ask AI")}>
            <ArrowRight className="!h-3.5 !w-3.5" />
          </Button>
        </div>
        <div className="pl-5">
          {selectedModel && (
            <ModelSelectorDropdown selectedModel={selectedModel} onModelChange={handleModelChange} compact />
          )}
        </div>
        {flyFromRect && <AiStyleSparkleFly fromRect={flyFromRect} onComplete={() => setFlyFromRect(null)} />}
      </div>
    </PanelItemWithAccordion>
  );
}
