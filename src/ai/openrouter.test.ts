import { afterEach, describe, expect, it, vi } from "vitest";
import { openRouterPlugin } from "./openrouter";

const createOpenRouter = vi.hoisted(() =>
  vi.fn((_options: Record<string, unknown>) => ({ languageModel: (id: string) => ({ id }) })),
);

vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter }));

afterEach(() => {
  vi.unstubAllEnvs();
  createOpenRouter.mockClear();
});

describe("openRouterPlugin (static SDK import)", () => {
  it("matches the built-in plugin's identity, so error messages stay the same", () => {
    expect(openRouterPlugin.id).toBe("openrouter");
    expect(openRouterPlugin.label).toBe("OpenRouter");
    expect(openRouterPlugin.packageName).toBe("@openrouter/ai-sdk-provider");
  });

  it("activates on the API key, and stays inactive without it", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-1");
    expect(openRouterPlugin.isConfigured()).toBe(true);

    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(openRouterPlugin.isConfigured()).toBe(false);
  });

  it("rebuilds when the key rotates", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-1");
    const first = openRouterPlugin.fingerprint?.();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-2");

    expect(openRouterPlugin.fingerprint?.()).not.toBe(first);
  });

  it("builds the provider with the key and usage accounting", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-1");

    const provider = await openRouterPlugin.createProvider();

    expect(createOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "sk-or-1", extraBody: { usage: { include: true } } }),
    );
    expect(typeof provider.languageModel).toBe("function");
  });

  it("passes the app identity through only when it is set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-1");
    vi.stubEnv("OPENROUTER_APP_NAME", "My Site");
    vi.stubEnv("OPENROUTER_APP_URL", "");

    await openRouterPlugin.createProvider();

    const options = createOpenRouter.mock.calls[0][0];
    expect(options.appName).toBe("My Site");
    expect(options).not.toHaveProperty("appUrl");
  });
});
