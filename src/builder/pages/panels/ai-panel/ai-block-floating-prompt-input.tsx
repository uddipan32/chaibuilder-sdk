import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { ModelSelectorDropdown } from "./model-selector-dropdown";
import { useSelectedAiModel } from "./use-selected-ai-model";

const AiBlockFloatingAiPromptInput = ({
  selectedLang,
  isLoading,
  onSend,
}: {
  selectedLang?: string;
  isLoading: boolean;
  onSend: any;
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [selectedModel, handleModelChange] = useSelectedAiModel();

  const send = (prompt: string) => {
    if (!prompt || isLoading) return;
    setInput("");
    onSend(prompt, undefined, [], selectedModel);
  };
  return (
    <div className={`overflow-hidden`}>
      <div className="border-b border-[0.5px]! border-gray-500 pb-1">
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && input.trim()) {
              e.preventDefault();
              send(input.trim());
            }
          }}
          placeholder={selectedLang ? t("Ask to update content") : t("Ask anything...")}
          disabled={isLoading}
          autoFocus
          className="w-full resize-none rounded-none border-none p-2 text-xs text-black outline-none focus:outline-none focus:ring-0"
        />
      </div>
      <div className="flex items-center justify-between border-b border-[0.5px] border-gray-500 px-1 py-1 text-black">
        {selectedModel ? (
          <ModelSelectorDropdown
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            disabled={isLoading}
            forceLight
            compact
          />
        ) : null}
        <Button
          onClick={() => send(input.trim())}
          size="xs"
          disabled={isLoading || !input.trim()}
          className="ml-auto bg-blue-500 text-white hover:bg-blue-600">
          <ArrowRight className="!h-3 !w-3" />
        </Button>
      </div>
      <div className="max-h-24 overflow-y-auto">
        {[...(selectedLang ? ["Translate"] : []), "Make longer", "Make shorter", "Fix grammar"].map((preset) => (
          <button
            key={preset}
            aria-label={preset}
            onClick={() => send(preset)}
            className="h-6 w-full cursor-pointer overflow-hidden truncate px-2 py-1 text-left text-xs font-medium leading-none text-black hover:bg-gray-200 hover:text-blue-500">
            <Sparkles className="mr-1 inline h-3 w-3" /> {preset}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AiBlockFloatingAiPromptInput;
