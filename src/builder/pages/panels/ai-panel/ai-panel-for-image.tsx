"use client";

import type { FileUIPart } from "ai";
import { ArrowRight, Bot, Settings } from "lucide-react";
import { Fragment, lazy, startTransition, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConversationEmptyState } from "~/builder/pages/components/ai-elements/conversation";
import { Message as AiMessage, MessageContent } from "~/builder/pages/components/ai-elements/message";
import { TaskMessage } from "~/builder/pages/components/ai-elements/task-message";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Loading } from "~/components/ui/loader";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ChaiBlock } from "~/types/common";
import { useAIActionModel } from "../../hooks/project/use-builder-prop";
import { AIModel, useAIConfig, useAIModels } from "./ai-models-context";
import { getHumanReadableError, isValidBase64, Message } from "./ai-panel-helper";
import { getDefaultModel } from "./models";
const AiPromptInput = lazy(() => import("./ai-prompt-input"));

interface AiPanelForImageProps {
  fetch: any;
  input: string;
  isLoading: boolean;
  messages: Message[];
  fallbackLang: string;
  selectedLang: string;
  handleStop: () => void;
  handleReset: () => void;
  forceNewConversation: boolean;
  currentBlock: ChaiBlock | null;
  suggestNewConversation: boolean;
  setInput: (value: string) => void;
  abortController: AbortController | null;
  setIsLoading: (loading: boolean) => void;
  setCurrentBlock: (block: ChaiBlock | null) => void;
  setAbortController: (controller: AbortController | null) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  isFloatingPanel?: boolean;
  isGenerateImagePanel?: boolean;
  onImageGenerate?: (base64: string) => void;
}

const AiPanelForImage = ({
  fetch,
  input,
  messages,
  setInput,
  isLoading,
  handleStop,
  setMessages,
  setIsLoading,
  selectedLang,
  setAbortController,
  setCurrentBlock,
  selectedModel,
  onModelChange,
  onImageGenerate = (_base64: string) => {},
  isGenerateImagePanel = false,
}: AiPanelForImageProps) => {
  const { t } = useTranslation();
  const { models } = useAIModels();
  const config = useAIConfig();
  const defaultModel = models.find((model: AIModel) => model.id === getDefaultModel()?.id) || models[0];
  const currentSelectedModel = selectedModel || defaultModel.id;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("16:9");
  const [quality, setQuality] = useState<number>(80);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  const usedModel = useAIActionModel("AI_GENERATE_IMAGE", "google/gemini-2.5-flash-image");
  const handleGenerateImage = async (prompt: string, content?: string, _images?: FileUIPart[], _model?: string) => {
    // Find the last assistant message with an image (for image editing/improvement)
    const lastAssistantImage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content?.startsWith("data:image"));

    const userMessageObj: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content || prompt || t("Generate image"),
      userMessage: content || prompt || t("Generate image"),
    };

    setIsLoading(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    setMessages((prev) => [...prev, userMessageObj]);

    // Trigger stream start event
    config.onAIEvent?.({
      type: "stream_start",
      model: usedModel,
      timestamp: Date.now(),
    });

    try {
      const requestBody: any = {
        messages: [userMessageObj],
        initiator: "GENERATE_IMAGE",
        model: usedModel,
        context: config.context,
        image: {
          lastImage: lastAssistantImage?.content,
          aspectRatio,
          quality,
        },
      };

      const response = await fetch({
        body: { action: ACTIONS.AI_GENERATE_IMAGE, data: requestBody },
        streamResponse: true,
        options: { signal: controller.signal },
      });

      if (!response.ok) {
        throw new Error(t("Failed to get AI response"));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) throw new Error(t("Response body is not readable"));

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 2).toString(), role: "assistant", content: accumulatedText },
      ]);

      // Call the onImageGenerate callback with the base64 image
      if (onImageGenerate) {
        onImageGenerate(accumulatedText);
      }

      // Trigger success callbacks with actual AI response (non-urgent update)
      startTransition(() => {
        const timestamp = Date.now();
        config.onSuccess?.({
          content: accumulatedText,
          model: usedModel,
          timestamp,
        });
        config.onComplete?.({
          success: true,
          content: accumulatedText,
          model: usedModel,
          timestamp,
        });
        config.onAIEvent?.({
          type: "completion",
          content: accumulatedText,
          model: usedModel,
          timestamp,
        });
      });
    } catch (error: any) {
      // Don't show error message if request was aborted
      if (error.name !== "AbortError") {
        const humanReadableMsg = getHumanReadableError(error);
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: humanReadableMsg,
        };

        // Remove the reasoning message and add error message
        setMessages((prev) => {
          const filtered = prev.filter((m) => !(m.isReasoning && m.isStreaming));
          return [...filtered, errorMsg];
        });

        // Trigger error callbacks with actual error (non-urgent update)
        startTransition(() => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const timestamp = Date.now();
          config.onError?.({ error: errorMessage, model: usedModel, timestamp });
          config.onComplete?.({
            success: false,
            error: errorMessage,
            model: usedModel,
            timestamp,
          });
          config.onAIEvent?.({
            type: "error",
            error: errorMessage,
            model: usedModel,
            timestamp,
          });
        });
      }
    } finally {
      setIsLoading(false);
      setInput("");
      setCurrentBlock(null);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Scrollable conversation area */}
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center p-3">
          <ConversationEmptyState
            icon={<Bot size={24} className="text-foreground/50" />}
            title={t("Generate images with AI")}
            description={t("Describe the image you want to generate.")}
          />
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto py-2">
          {messages.map(
            (message) =>
              message.role !== "system" && (
                <Fragment key={message.id}>
                  {message.isTask && !message.isTaskCompleted ? (
                    <TaskMessage content={message.content} isLoading={message.isTaskLoading} />
                  ) : (
                    <AiMessage from={message.role}>
                      <MessageContent className="!p-0">
                        {message.role === "assistant" ? (
                          isValidBase64(message.content) ? (
                            <div className="group relative">
                              <img
                                src={message.content}
                                alt="AI generated image"
                                className="max-h-32 w-full cursor-pointer rounded object-contain object-left hover:opacity-70"
                                onClick={() => onImageGenerate(message.content)}
                              />
                              <Button
                                variant="default"
                                size="xs"
                                onClick={() => onImageGenerate(message.content)}
                                className="absolute bottom-1 left-1 font-light opacity-0 group-hover:opacity-100">
                                <ArrowRight className="h-3 w-3" /> {t("View")}
                              </Button>
                            </div>
                          ) : (
                            <div className="rounded-sm bg-destructive/10 px-2 py-1 text-xs text-destructive/80">
                              {getHumanReadableError(message.content).includes("--")
                                ? t("Image generation failed. Try again")
                                : getHumanReadableError(message.content)}
                            </div>
                          )
                        ) : (
                          <div className="rounded-sm bg-accent px-2 py-1 text-xs">
                            {message.userMessage || message.content}
                          </div>
                        )}
                      </MessageContent>
                    </AiMessage>
                  )}
                </Fragment>
              ),
          )}
          {isLoading && (
            <div className="mt-2 flex h-32 w-32 animate-pulse items-center justify-center gap-1 rounded-md bg-primary/10 p-2 text-xs text-primary">
              <Loading className="h-3 w-3 text-primary" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Sticky input at bottom */}
      <div className="flex-shrink-0 space-y-0">
        <div className="mx-auto flex w-[96%] items-center justify-between gap-x-1 rounded-t-md border border-b-0 bg-accent/50 pl-2 text-center text-[11px] font-light text-foreground dark:bg-accent">
          <div>
            <span>
              {t("Aspect ratio")}: {aspectRatio}
            </span>{" "}
            <span className="px-2 text-muted-foreground">|</span>{" "}
            <span>
              {t("Quality")}: {quality > 80 ? t("High") : quality > 60 ? t("Medium") : t("Low")}
            </span>{" "}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-xs" variant="ghost">
                <Settings className="!h-3 !w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44" align="start" side="right">
              <div className="text-xs font-medium">{t("Image configuration")}</div>
              <div>
                <Label>{t("Aspect ratio")}</Label>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Ratio")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Quality")}</Label>
                <Select value={String(quality)} onValueChange={(v) => setQuality(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Quality")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">{t("Low")}</SelectItem>
                    <SelectItem value="80">{t("Medium")}</SelectItem>
                    <SelectItem value="100">{t("High")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Suspense fallback={<div className="w-full animate-pulse rounded-md bg-accent" />}>
          <AiPromptInput
            input={input}
            setInput={setInput}
            onSend={handleGenerateImage}
            onStop={handleStop}
            isLoading={isLoading}
            selectedLang={selectedLang}
            currentBlock={undefined}
            disabled={input?.length === 0}
            selectedModel={currentSelectedModel}
            onModelChange={onModelChange}
            isGenerateImagePanel={isGenerateImagePanel}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default AiPanelForImage;
