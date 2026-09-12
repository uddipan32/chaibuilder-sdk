import { afterEach, describe, expect, it, vi } from "vitest";
import { openAICompatiblePlugin } from "./openai-compatible";

const createOpenAICompatible = vi.hoisted(() =>
  vi.fn((_options: Record<string, unknown>) => ({ languageModel: (id: string) => ({ id }) })),
);

vi.mock("@ai-sdk/openai-compatible", () => ({ createOpenAICompatible }));

afterEach(() => {
  vi.unstubAllEnvs();
  createOpenAICompatible.mockClear();
});

describe("openAICompatiblePlugin (static SDK import)", () => {
  it("matches the built-in plugin's identity, so error messages stay the same", () => {
    expect(openAICompatiblePlugin.id).toBe("openai-compatible");
    expect(openAICompatiblePlugin.label).toBe("OpenAI-compatible");
    expect(openAICompatiblePlugin.packageName).toBe("@ai-sdk/openai-compatible");
  });

  it("activates on the base URL — without it the AI gateway keeps serving requests", () => {
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://router.huggingface.co/v1");
    expect(openAICompatiblePlugin.isConfigured()).toBe(true);

    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "");
    expect(openAICompatiblePlugin.isConfigured()).toBe(false);
  });

  it("rebuilds when the endpoint or key changes", () => {
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://localhost:11434/v1");
    const first = openAICompatiblePlugin.fingerprint?.();

    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "sk-1");

    expect(openAICompatiblePlugin.fingerprint?.()).not.toBe(first);
  });

  it("builds the provider from the endpoint, with the default label", async () => {
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://api.groq.com/openai/v1");
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "sk-1");

    const provider = await openAICompatiblePlugin.createProvider();

    expect(createOpenAICompatible).toHaveBeenCalledWith({
      name: "openai-compatible",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: "sk-1",
    });
    expect(typeof provider.languageModel).toBe("function");
  });

  it("omits the key for a keyless local server and takes a custom name", async () => {
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "http://localhost:11434/v1");
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "");
    vi.stubEnv("OPENAI_COMPATIBLE_NAME", "ollama");

    await openAICompatiblePlugin.createProvider();

    const options = createOpenAICompatible.mock.calls[0][0];
    expect(options.name).toBe("ollama");
    expect(options).not.toHaveProperty("apiKey");
  });
});
