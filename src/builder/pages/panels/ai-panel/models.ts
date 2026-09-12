export const AI_MODELS = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "0.5x Credits",
    multiplier: 0.5,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "1.25x Credits",
    multiplier: 1.25,
  },
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "google",
    description: "1x Credits",
    multiplier: 1,
  },
  {
    id: "google/gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    description: "2.5x Credits",
    multiplier: 2.5,
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "openai",
    description: "2x Credits",
    multiplier: 2,
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "1x Credits",
    multiplier: 1,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    description: "3x Credits",
    multiplier: 3,
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    description: "3x Credits",
    multiplier: 3,
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    description: "2x Credits",
    multiplier: 2,
  },
];

export const DEFAULT_MODEL_ID = "google/gemini-3-flash";

export const getModelById = (id: string) => {
  return AI_MODELS.find((model) => model.id === id);
};

export const getDefaultModel = () => {
  return AI_MODELS.find((model) => model.id === DEFAULT_MODEL_ID) || AI_MODELS[0];
};
