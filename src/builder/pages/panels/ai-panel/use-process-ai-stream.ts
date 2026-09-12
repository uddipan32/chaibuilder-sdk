import { useQueryClient } from "@tanstack/react-query";
import { useAddCustomBlock } from "~/builder/hooks/use-add-custom-block";
import { useBindProp } from "~/builder/hooks/use-bind-prop";
import { useCallback } from "react";
import { removeBraces } from "~/builder/core/utils/remove-braces";
import { useAddBlock } from "~/builder/hooks/use-add-block";
import { useRemoveBlocks } from "~/builder/hooks/use-remove-blocks";
import { useReplaceBlock } from "~/builder/hooks/use-replace-block";
import { AI_CREDITS_QUERY_KEY } from "~/builder/pages/constants/AI_CREDITS";
import { getBlocksFromHTML } from "~/utils/import-html/html-to-json";
import { Message } from "./ai-panel-helper";

interface ActionData {
  type: "ADD" | "REMOVE" | "EDIT";
  parentId?: string;
  position?: number;
  ids?: string[];
  blockId?: string;
  html?: string;
  message?: string;
}

interface StreamState {
  isInAction: boolean;
  currentAction: ActionData | null;
  htmlBuffer: string;
  isCapturingHtml: boolean;
}

type StreamMode = "legacy-text" | "legacy-data" | "ui-message-sse";

interface LegacyDataStreamPart {
  type: "text" | "tool_call" | "tool_result" | "finish_message" | "finish_step" | "error" | "other";
  value?: any;
  toolCallId?: string;
  toolName?: string;
  args?: any;
}

interface UiMessageStreamChunk {
  type: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  errorText?: string;
  finishReason?: string;
}

function parseLegacyDataStreamPart(line: string): LegacyDataStreamPart {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid data stream part: no colon separator");
  }

  const prefix = line.substring(0, colonIndex);
  const rawValue = line.substring(colonIndex + 1);

  let parsedValue: any;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    parsedValue = rawValue;
  }

  switch (prefix) {
    case "0":
      return { type: "text", value: parsedValue };
    case "9":
      return {
        type: "tool_call",
        toolCallId: parsedValue.toolCallId,
        toolName: parsedValue.toolName,
        args: parsedValue.args,
      };
    case "a":
      return {
        type: "tool_result",
        toolCallId: parsedValue.toolCallId,
        value: parsedValue.result,
      };
    case "d":
      return { type: "finish_message", value: parsedValue };
    case "3":
      return { type: "error", value: parsedValue };
    default:
      return { type: "other", value: parsedValue };
  }
}

function parseUiMessageStreamLine(line: string): UiMessageStreamChunk | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return null;
  }

  const payload = trimmed.slice(trimmed.indexOf(":") + 1).trim();
  if (!payload || payload === "[DONE]") {
    return { type: "done" };
  }

  try {
    return JSON.parse(payload) as UiMessageStreamChunk;
  } catch {
    return null;
  }
}

function detectStreamMode(firstLine: string): StreamMode {
  const trimmed = firstLine.trim();
  if (parseUiMessageStreamLine(trimmed)) {
    return "ui-message-sse";
  }

  try {
    parseLegacyDataStreamPart(trimmed);
    return "legacy-data";
  } catch {
    return "legacy-text";
  }
}

export const useProcessAiStream = () => {
  // TODO: Verify correct SDK function signatures
  const { addPredefinedBlock } = useAddBlock();
  const replaceBlock = useReplaceBlock();
  const removeBlocks = useRemoveBlocks();
  const queryClient = useQueryClient();
  const addCustomBlock = useAddCustomBlock();
  const bindProp = useBindProp();

  const handleAddAction = useCallback(
    async (action: ActionData, html: string) => {
      if (!html) return;

      const blocks = await getBlocksFromHTML(html);
      await addPredefinedBlock(blocks, action.parentId, action.position);
    },
    [addPredefinedBlock],
  );

  const handleEditAction = useCallback(
    async (action: ActionData, html: string) => {
      if (!action.blockId || !html) return;
      const blocks = await getBlocksFromHTML(html);
      await replaceBlock(action.blockId, blocks);
    },
    [replaceBlock],
  );

  const handleRemoveAction = useCallback(
    async (action: ActionData) => {
      if (!action.ids || action.ids.length === 0) return;
      await removeBlocks(action.ids);
    },
    [removeBlocks],
  );

  const getCanvasElement = (parentId?: string, position?: number): HTMLElement | null => {
    // Always create a fresh canvas element for proper positioning
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    if (!iframeDoc) {
      return null;
    }
    const iframeDocument = iframeDoc?.contentDocument;
    if (!iframeDocument) {
      return null;
    }

    // Remove any existing canvas elements first
    const existingCanvases = iframeDocument.querySelectorAll("[data-stream-canvas]");
    existingCanvases.forEach((canvas) => canvas.remove());

    let targetContainer: HTMLElement | null = null;

    if (parentId && parentId !== "undefined") {
      // Try to find the parent block
      targetContainer = iframeDocument.querySelector(`[data-block-id="${parentId}"]`);
    }

    // If no parent found, fall back to body
    if (!targetContainer) {
      targetContainer = iframeDocument.querySelector(`[data-block-id="canvas"]`);
    }

    if (!targetContainer) {
      return null;
    }

    // Create new canvas element
    const canvasElement = iframeDocument.createElement("div");
    canvasElement.setAttribute("data-stream-canvas", "true");

    // Position the canvas based on the position parameter
    if (position !== undefined && position >= 0 && targetContainer.children) {
      const insertIndex = Math.min(position, targetContainer.children.length);
      if (insertIndex < targetContainer.children.length) {
        targetContainer.insertBefore(canvasElement, targetContainer.children[insertIndex]);
      } else {
        targetContainer.appendChild(canvasElement);
      }
    } else {
      // Default to appending at the end
      targetContainer.appendChild(canvasElement);
    }

    return canvasElement;
  };

  const getCanvasElementForEdit = (blockId: string): HTMLElement | null => {
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    if (!iframeDoc) {
      return null;
    }
    const iframeDocument = iframeDoc?.contentDocument;
    if (!iframeDocument) {
      return null;
    }

    // Remove any existing canvas elements first
    const existingCanvases = iframeDocument.querySelectorAll("[data-stream-canvas]");
    existingCanvases.forEach((canvas) => canvas.remove());

    // Find the block to edit
    const targetBlock = iframeDocument.querySelector(`[data-block-id="${blockId}"]`);
    if (!targetBlock) {
      return null;
    }

    // Create new canvas element to replace the target block temporarily
    const canvasElement = iframeDocument.createElement("div");
    canvasElement.setAttribute("data-stream-canvas", "true");

    // Insert the canvas element right after the target block
    targetBlock.parentNode?.insertBefore(canvasElement, targetBlock.nextSibling);

    // Hide the original block during streaming
    (targetBlock as HTMLElement).style.display = "none";

    return canvasElement;
  };

  const scrollElementIntoView = (element: HTMLElement) => {
    const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
    const iframeWindow = iframeDoc?.contentWindow;
    if (iframeWindow) {
      // Always scroll to keep the bottom of the element in view as content streams
      element.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const streamHtmlToCanvasForAdd = useCallback((html: string, parentId?: string, position?: number) => {
    const element = getCanvasElement(parentId, position);
    if (element) {
      element.innerHTML = html;
      scrollElementIntoView(element);
    }
  }, []);

  const streamHtmlToCanvasForEdit = useCallback((html: string, blockId: string) => {
    const element = getCanvasElementForEdit(blockId);
    if (element) {
      element.innerHTML = html;
      scrollElementIntoView(element);
    }
  }, []);

  const parseActionLine = (line: string): ActionData | null => {
    const actionMatch = line.match(/^--ACTION=(.+)--$/);
    if (!actionMatch) return null;

    const actionContent = actionMatch[1];

    // Extract IDS first if present

    const actionParts: string[] = actionContent.replace(/--/g, "").split("|");

    const type = actionParts[0] as "ADD" | "REMOVE" | "EDIT";
    const action: ActionData = { type };

    // Parse other parts
    actionParts.forEach((part) => {
      const trimmedPart = part.trim();
      if (trimmedPart.startsWith("PARENT=")) {
        const parentId = removeBraces(trimmedPart.substring(7));
        action.parentId = parentId === "undefined" ? undefined : parentId;
      } else if (trimmedPart.startsWith("POS=")) {
        action.position = parseInt(removeBraces(trimmedPart.substring(4)));
      } else if (trimmedPart.startsWith("ID=")) {
        action.blockId = removeBraces(trimmedPart.substring(3));
      } else if (trimmedPart.startsWith("IDS=")) {
        action.ids = removeBraces(trimmedPart.substring(4))
          .split(",")
          .map((id) => id.trim());
      }
    });

    return action;
  };

  const handleToolCall = useCallback(
    async (
      toolName: string,
      args: any,
      setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
    ) => {
      switch (toolName) {
        case "remove_blocks":
          if (args.ids && args.ids.length > 0) {
            await removeBlocks(args.ids);
            if (args.reason) {
              setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: args.reason }]);
            }
          }
          break;

        case "add_custom_block":
          await addCustomBlock(args.type, args.parentId, args.position, args.props ?? {});
          if (args.reason) {
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: args.reason }]);
          }
          break;

        case "bind_prop":
          if (bindProp(args.blockId, args.propName, args.bindingPath) === false) {
            console.warn("[chai] rejected invalid bind_prop pipeline");
            break;
          }
          if (args.reason) {
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: args.reason }]);
          }
          break;

        case "get_partial_blocks":
          // Server-side-only tool — executed on server.
          break;

        default:
          console.warn(`[useProcessAiStream] Unknown tool call: ${toolName}`);
      }
    },
    [removeBlocks, addCustomBlock, bindProp],
  );

  return useCallback(
    async (
      reader: ReadableStreamDefaultReader,
      setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
    ) => {
      const decoder = new TextDecoder();
      let protocolBuffer = "";
      let isStarted = false;
      let currentTaskMessageId: string | null = null;
      let streamedTextBuffer = ""; // Accumulate streamed text
      let streamMode: StreamMode | null = null; // null = not yet determined

      // Collect all pending tool calls to process in order.
      const pendingToolCalls: Array<{ id: string; name: string; args: string }> = [];

      const flushPendingToolCalls = async () => {
        for (const tc of pendingToolCalls.splice(0)) {
          let args: any;
          try {
            args = JSON.parse(tc.args);
          } catch {
            args = {};
          }
          await handleToolCall(tc.name, args, setMessages);
        }
      };

      const appendProtocolText = async (textChunk: string) => {
        if (!textChunk) return;
        protocolBuffer += textChunk;
        const lines = protocolBuffer.split("\n");
        protocolBuffer = lines.pop() ?? "";
        for (const line of lines) {
          await processLine(line);
        }
      };

      const state: StreamState = {
        isInAction: false,
        currentAction: null,
        htmlBuffer: "",
        isCapturingHtml: false,
      };

      const processLine = async (line: string) => {
        const trimmedLine = line.trim();

        if (trimmedLine === "--START--") {
          isStarted = true;
          return;
        }

        if (!isStarted) return;

        if (trimmedLine === "--END--") {
          // Process any remaining action
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          // Clean up canvas
          const iframeDoc = document.getElementById("canvas-iframe") as HTMLIFrameElement;
          const existingCanvases = iframeDoc?.contentDocument?.querySelectorAll("[data-stream-canvas]");
          existingCanvases?.forEach((canvas) => canvas.remove());
          return;
        }

        if (trimmedLine.startsWith("--THINKING=")) {
          const thinkingContent = removeBraces(trimmedLine.substring(11));

          // Update the reasoning message or create it if it doesn't exist
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isReasoning) {
              // Update existing reasoning message
              lastMessage.content = thinkingContent;
              lastMessage.isStreaming = false;
            } else {
              // Create new reasoning message
              const reasoningMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: thinkingContent,
                isReasoning: true,
                isStreaming: false,
              };
              updated.push(reasoningMessage);
            }

            return updated;
          });
          return;
        }

        if (trimmedLine.startsWith("--TASK=")) {
          const taskContent = trimmedLine.substring(7);

          // Create task message with loading state using unique ID
          const taskMessageId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const taskMessage: Message = {
            id: taskMessageId,
            role: "assistant",
            content: removeBraces(taskContent.replace(/--$/, "")),
            isTask: true,
            isTaskLoading: true,
            isTaskCompleted: false,
          };

          currentTaskMessageId = taskMessageId;
          setMessages((prev) => [...prev, taskMessage]);
          return;
        }

        if (trimmedLine.startsWith("--MSG=")) {
          const messageContent = trimmedLine.substring(6);

          // --MSG= creates plain assistant messages
          const newMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: removeBraces(messageContent.replace(/--$/g, "")),
            isReasoning: false,
            isStreaming: false,
          };

          // Remove any streaming reasoning messages and add the new message
          setMessages((prev) => {
            const filtered = prev.filter((m) => !(m.isReasoning && m.isStreaming));
            return [...filtered, newMessage];
          });
          return;
        }

        if (trimmedLine.startsWith("--ACTION=")) {
          // Process previous action if exists
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          state.currentAction = parseActionLine(trimmedLine);
          state.htmlBuffer = "";
          state.isInAction = true;
          return;
        }

        if (trimmedLine === "--ENDACTION--") {
          if (state.currentAction && (state.htmlBuffer || state.currentAction.type === "REMOVE")) {
            await processAction(state.currentAction, state.htmlBuffer);
          }

          // Remove completed task message from the list
          if (currentTaskMessageId) {
            setMessages((prev) => {
              return prev.map((msg) => {
                if (!msg.isTask) return msg;
                return { ...msg, isTaskCompleted: true };
              });
            });
            currentTaskMessageId = null;
          }

          state.currentAction = null;
          state.htmlBuffer = "";
          state.isInAction = false;
          return;
        }

        if (trimmedLine === "--HTML--") {
          state.isCapturingHtml = true;
          return;
        }

        if (trimmedLine === "--ENDHTML--") {
          state.isCapturingHtml = false;
          return;
        }

        // Handle inline HTML (--HTML--content--ENDHTML-- on same line)
        if (trimmedLine.startsWith("--HTML--") && trimmedLine.includes("--ENDHTML--")) {
          const htmlMatch = trimmedLine.match(/^--HTML--(.+?)--ENDHTML--$/);
          if (htmlMatch && state.currentAction) {
            const htmlContent = htmlMatch[1];
            state.htmlBuffer += htmlContent;

            // Stream HTML to canvas for real-time preview
            if (state.currentAction.type === "ADD") {
              streamHtmlToCanvasForAdd(state.htmlBuffer, state.currentAction.parentId, state.currentAction.position);
            } else if (state.currentAction.type === "EDIT" && state.currentAction.blockId) {
              streamHtmlToCanvasForEdit(state.htmlBuffer, state.currentAction.blockId);
            }
          }
          return;
        }

        // Capture HTML content
        if (state.isCapturingHtml && state.currentAction) {
          state.htmlBuffer += line + "\n";

          // Stream HTML to canvas for real-time preview
          if (state.currentAction.type === "ADD") {
            streamHtmlToCanvasForAdd(state.htmlBuffer, state.currentAction.parentId, state.currentAction.position);
          } else if (state.currentAction.type === "EDIT" && state.currentAction.blockId) {
            streamHtmlToCanvasForEdit(state.htmlBuffer, state.currentAction.blockId);
          }
          return;
        }

        // Handle regular streamed text (not a special marker)
        // Accumulate text and update the reasoning message to show streaming progress
        if (!trimmedLine.startsWith("--") && trimmedLine.length > 0) {
          // Never surface raw generated markup in the chat — HTML streams to the
          // canvas, not the conversation. Skip any line that looks like a tag.
          if (/^<\/?[a-zA-Z]/.test(trimmedLine)) return;
          streamedTextBuffer += line + "\n";

          // Update the reasoning message with streamed content
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage && lastMessage.role === "assistant" && lastMessage.isReasoning && lastMessage.isStreaming) {
              // Update existing reasoning message with streamed content
              lastMessage.content = streamedTextBuffer;
            }

            return updated;
          });
        }
      };

      const processAction = async (action: ActionData, html: string) => {
        try {
          switch (action.type) {
            case "ADD":
              await handleAddAction(action, html);
              break;
            case "EDIT":
              await handleEditAction(action, html);
              break;
            case "REMOVE":
              await handleRemoveAction(action);
              break;
          }
          setMessages((prev) => prev.filter((m) => !m.isTask));
        } catch (er) {
          console.log(er);
        }
      };

      // --- Legacy AI SDK data stream handler (0:/9: JSONL) ---
      const processLegacyDataStreamLine = async (line: string) => {
        if (!line.trim()) return;
        let part: LegacyDataStreamPart;
        try {
          part = parseLegacyDataStreamPart(line);
        } catch {
          return;
        }

        switch (part.type) {
          case "text":
            await appendProtocolText(part.value ?? "");
            break;

          case "tool_call":
            pendingToolCalls.push({
              id: part.toolCallId!,
              name: part.toolName!,
              args: JSON.stringify(part.args ?? {}),
            });
            break;

          case "tool_result":
            break;

          case "finish_message":
            await flushPendingToolCalls();
            break;

          case "error": {
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: String(part.value),
            };
            setMessages((prev) => [...prev, errorMessage]);
            break;
          }
        }
      };

      // --- AI SDK v6 UI message SSE handler (data: {"type":"text-delta",...}) ---
      const processUiMessageStreamLine = async (line: string) => {
        const chunk = parseUiMessageStreamLine(line);
        if (!chunk) return;

        switch (chunk.type) {
          case "text-delta":
            await appendProtocolText(chunk.delta ?? "");
            break;

          case "tool-input-available":
            pendingToolCalls.push({
              id: chunk.toolCallId ?? "",
              name: chunk.toolName ?? "",
              args: JSON.stringify(chunk.input ?? {}),
            });
            break;

          case "tool-result":
          case "tool-output-available":
            break;

          case "finish":
          case "finish-step":
            await flushPendingToolCalls();
            break;

          case "error": {
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: chunk.errorText ?? "An error occurred while streaming the AI response.",
            };
            setMessages((prev) => [...prev, errorMessage]);
            break;
          }

          case "done":
          case "start-step":
          case "start":
          case "text-start":
          case "text-end":
          case "finish_message":
            break;
        }
      };

      try {
        let streamBuffer = "";
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });

          // Wait for a complete first line before locking stream mode — avoids
          // mis-detecting when the first TCP chunk splits "data:" across reads.
          if (streamMode === null) {
            const newlineIndex = streamBuffer.indexOf("\n");
            if (newlineIndex === -1) {
              continue;
            }

            const firstLine = streamBuffer.slice(0, newlineIndex).trim();
            if (!firstLine) {
              streamBuffer = streamBuffer.slice(newlineIndex + 1);
              continue;
            }

            streamMode = detectStreamMode(firstLine);
          }

          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() ?? "";

          if (streamMode === "ui-message-sse") {
            for (const line of lines) {
              await processUiMessageStreamLine(line);
            }
          } else if (streamMode === "legacy-data") {
            for (const line of lines) {
              await processLegacyDataStreamLine(line);
            }
          } else {
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("9:") || trimmed.startsWith("d:") || trimmed.startsWith("3:")) {
                await processLegacyDataStreamLine(line);
              } else {
                await processLine(line);
              }
            }
          }
        }

        if (streamBuffer.trim()) {
          if (streamMode === "ui-message-sse") {
            await processUiMessageStreamLine(streamBuffer);
          } else if (streamMode === "legacy-data") {
            await processLegacyDataStreamLine(streamBuffer);
          } else {
            const trimmed = streamBuffer.trim();
            if (trimmed.startsWith("9:") || trimmed.startsWith("d:") || trimmed.startsWith("3:")) {
              await processLegacyDataStreamLine(streamBuffer);
            } else {
              await processLine(streamBuffer);
            }
          }
        }

        if (protocolBuffer.trim()) {
          await processLine(protocolBuffer);
          protocolBuffer = "";
        }

        await flushPendingToolCalls();

        queryClient.invalidateQueries({
          queryKey: [AI_CREDITS_QUERY_KEY],
        });
      } catch (e) {
        console.log(e);
      }
    },
    [
      handleAddAction,
      handleEditAction,
      handleRemoveAction,
      handleToolCall,
      queryClient,
      streamHtmlToCanvasForAdd,
      streamHtmlToCanvasForEdit,
    ],
  );
};
