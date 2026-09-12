import { ArrowTopRightIcon, ReloadIcon, StopIcon } from "@radix-ui/react-icons";
import { first } from "lodash-es";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QuickPrompts } from "~/builder/core/components/QuickPrompts";
import { useAskAi } from "~/builder/hooks/use-ask-ai";
import { useSelectedBlock, useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { AiIcon } from "./ai/ai-icon";
import { TypeIcon } from "./sidepanels/panels/outline/block-type-icon";

export const AIUserPrompt = ({ blockId }: { blockId: string | undefined }) => {
  const { t } = useTranslation();
  const { askAi, loading, error } = useAskAi();
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef(null);
  const selectedBlock = useSelectedBlock();

  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  const onComplete = () => {
    if (!error) setPrompt("");
  };

  return (
    <div className="">
      {blockId ? (
        <div className="">
          <label className="text-xs font-medium text-gray-500">{t("Selected block")}</label>
          {selectedBlock && (
            <div className="flex items-center gap-x-1 rounded border border-primary/20 bg-primary/10 p-1.5 text-xs text-primary">
              <TypeIcon type={selectedBlock._type} />{" "}
              <p className="truncate whitespace-nowrap leading-none">{selectedBlock._name || selectedBlock._type}</p>
            </div>
          )}
          <br />

          <label className="text-xs font-medium text-gray-500">{t("Quick actions")}</label>

          <div className="rounded border p-2 text-sm">
            <QuickPrompts
              onClick={(prompt: string) => {
                if (timerRef.current) clearTimeout(timerRef.current);
                askAi("content", blockId, prompt, onComplete);
              }}
            />
          </div>

          <br />

          <label className="text-xs font-medium text-gray-500">{t("Ask AI")}</label>
          <div className="rounded border p-2 text-xs focus-within:border-gray-300">
            <Textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("Ask AI to edit content")}
              className="w-full resize-none border-none p-0 text-xs shadow-none outline-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (timerRef.current) clearTimeout(timerRef.current);
                  askAi("content", blockId, prompt, onComplete);
                }
              }}
            />
            <div className="flex items-center justify-end">
              {loading && (
                <Button variant="destructive" onClick={() => stop()} className="hidden h-4 w-4" size="icon">
                  <StopIcon className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  askAi("content", blockId, prompt, onComplete);
                }}
                variant="default"
                className="h-7 w-7"
                disabled={loading || prompt.trim().length < 1}
                size="icon">
                {loading ? <ReloadIcon className="h-4 w-4 animate-spin" /> : <ArrowTopRightIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="max-w-full pt-2">
            {error && (
              <p className="break-words rounded border border-red-500 bg-red-100 p-1 text-xs text-red-500">
                {(error as Error).message}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <div className="space-y-4 rounded-xl p-4 text-muted-foreground">
            <AiIcon className="mx-auto h-7 w-7 text-muted-foreground" />
            <h1>{t("Please select a block to Ask AI")}</h1>
          </div>
        </div>
      )}
    </div>
  );
};
export const AskAI = () => {
  const [ids] = useSelectedBlockIds();
  return (
    <div className="no-scrollbar mt-2 flex-1 overflow-y-auto">
      <AIUserPrompt blockId={first(ids)} />
    </div>
  );
};
