import { useCallback } from "react";
import { ACTIONS } from "~/builder/pages/constants/ACTIONS";
import { useAiContext } from "~/builder/pages/hooks/ai/use-ai-context";

const AI_ACTIONS = [
  ACTIONS.AI_EDIT_PAGE,
  ACTIONS.AI_EDIT_BLOCK,
  ACTIONS.AI_EDIT_LANG_PAGE,
  ACTIONS.AI_GENERATE_IMAGE,
  ACTIONS.AI_GENERATE_SEO_FIELD,
  ACTIONS.AI_GENERATE_THEME,
  ACTIONS.AI_ENHANCE_CONTEXT,
  ACTIONS.AI_SAVE_CONTEXT,
  ACTIONS.AI_GET_CONTEXT,
] as const;

type AIAction = (typeof AI_ACTIONS)[number];

export const isAIAction = (action: string): action is AIAction => {
  const aiActions: readonly string[] = AI_ACTIONS;
  return aiActions.includes(action);
};

export const useAiRequestHelper = () => {
  const { data: aiContext } = useAiContext();

  const prepareAIRequest = useCallback(
    (action: string, data: any, options: { includeContext?: boolean } = {}): { action: string; data: any } => {
      const { includeContext = true } = options;

      // If not an AI action or context not needed, return as-is
      if (!isAIAction(action) || !includeContext) {
        return { action, data };
      }

      // Don't override existing context in data
      if (data?.context !== undefined) {
        return { action, data };
      }

      // Add AI context if available
      const contextToAdd = aiContext || {};

      return {
        action,
        data: {
          ...data,
          context: contextToAdd,
        },
      };
    },
    [aiContext],
  );

  return {
    prepareAIRequest,
    isAIAction,
    aiContext,
  };
};
