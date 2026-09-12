import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { usePubSub } from "~/builder/hooks/use-pub-sub";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useSearchParams } from "~/builder/pages/hooks/utils/use-search-params";
import { usePendingAiPrompt } from "./pending-ai-prompt";

const AiBlockFloatingAiPromptInput = lazy(() => import("./ai-block-floating-prompt-input"));

/** Canvas popover for a block's AI icon: collects the prompt and hands it to
 * the side AI panel (same handoff as the Style panel) instead of chatting inline. */
const AiBlockFloatingHandoff = () => {
  const { t } = useTranslation();
  const publish = usePubSub();
  const selectedBlock = useSelectedBlock();
  const [, setPendingAiPrompt] = usePendingAiPrompt();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("page");

  const handleSend = (prompt: string, _content?: string, _images?: unknown[], model?: string) => {
    if (!prompt) return;
    if (!selectedBlock?._id) {
      toast.error(t("Select a block first."));
      return;
    }
    setPendingAiPrompt({ prompt, blockId: selectedBlock._id, model, autoType: true, pageId });
    publish(CHAI_BUILDER_EVENTS.OPEN_AI_PANEL);
  };

  return (
    <Suspense fallback={null}>
      <AiBlockFloatingAiPromptInput selectedLang="" isLoading={false} onSend={handleSend} />
    </Suspense>
  );
};

export default AiBlockFloatingHandoff;
