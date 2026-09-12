"use client";

import { Suspense, lazy } from "react";
import { Accordion, AccordionContent, AccordionItem } from "~/components/ui/accordion";

const AiPanelContent = lazy(() => import("~/builder/pages/panels/ai-panel/ai-panel-content"));

const BlockFloatingAiPrompt = ({
  isOpen,
  isLoading,
  updateLoadingState,
}: {
  isOpen: boolean;
  isLoading: boolean;
  updateLoadingState: (loading: boolean) => void;
}) => {
  if (!isOpen) return null;
  return (
    <Accordion
      className={`absolute top-6 overflow-hidden rounded-b border-2 border-t-0 border-blue-500 ${isOpen ? "" : "hidden"}`}
      value={isOpen ? "ai" : ""}
      type="single"
      collapsible>
      <AccordionItem value="ai" className="border-none">
        <AccordionContent
          id="canvas-block-floating-ai-prompt-input"
          className={`z-[1001] w-full rounded-b bg-white ${isLoading ? "sr-only h-0 w-0 overflow-hidden opacity-0" : "h-auto pb-0"}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>
          <Suspense fallback={null}>
            <AiPanelContent
              type="floating"
              onSuccess={console.log}
              onError={console.log}
              onComplete={console.log}
              updateLoadingState={updateLoadingState}
            />
          </Suspense>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default BlockFloatingAiPrompt;
