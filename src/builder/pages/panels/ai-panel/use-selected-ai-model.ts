import { useCallback, useEffect, useState } from "react";
import { AIModel, useAIModels } from "./ai-models-context";
import { MODEL_STORAGE_KEY } from "./ai-prompt-input";
import { getDefaultModel } from "./models";

/** Selected AI model synced to MODEL_STORAGE_KEY -- one preference shared across every composer. */
export function useSelectedAiModel(): [string | undefined, (model: string) => void] {
  const { models } = useAIModels();
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    () => (models.find((m: AIModel) => m.id === getDefaultModel()?.id) || models[0])?.id,
  );

  // `models` can still be resolving on first render -- re-check once populated.
  useEffect(() => {
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    if (savedModel && models.find((m: AIModel) => m.id === savedModel)) {
      setSelectedModel(savedModel);
      return;
    }
    setSelectedModel((prev) =>
      prev && models.find((m: AIModel) => m.id === prev)
        ? prev
        : (models.find((m: AIModel) => m.id === getDefaultModel()?.id) || models[0])?.id,
    );
  }, [models]);

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, []);

  return [selectedModel, handleModelChange];
}
