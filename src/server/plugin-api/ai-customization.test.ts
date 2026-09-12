import { afterEach, describe, expect, it } from "vitest";
import {
  registerChaiAiCustomization,
  resetChaiAiCustomizersForTests,
  resolveChaiAiPrompt,
  resolveChaiAiTools,
  type ChaiAiActionInfo,
} from "./ai-customization";

const info: ChaiAiActionInfo = { action: "AI_EDIT_PAGE", initiator: "page", appId: "app-1" };

describe("ai-customization registry", () => {
  afterEach(() => resetChaiAiCustomizersForTests());

  it("returns the default prompt unchanged when nothing is registered", async () => {
    expect(await resolveChaiAiPrompt("base prompt", info)).toBe("base prompt");
  });

  it("returns an empty tool map when nothing is registered", async () => {
    expect(await resolveChaiAiTools(info)).toEqual({});
  });

  it("runs a prompt customizer and passes it the action context", async () => {
    let seen: ChaiAiActionInfo | null = null;
    registerChaiAiCustomization("app", {
      prompt: (prompt, ctx) => {
        seen = ctx;
        return `${prompt}\nAlways use British spelling.`;
      },
    });

    const result = await resolveChaiAiPrompt("base prompt", info);
    expect(result).toContain("British spelling");
    expect(seen).toMatchObject({ action: "AI_EDIT_PAGE", initiator: "page" });
  });

  it("chains prompt customizers from distinct names in registration order", async () => {
    registerChaiAiCustomization("one", { prompt: (p) => `${p} [one]` });
    registerChaiAiCustomization("two", { prompt: (p) => `${p} [two]` });

    expect(await resolveChaiAiPrompt("base", info)).toBe("base [one] [two]");
  });

  it("replaces the entry on re-registration under the same name (idempotent)", async () => {
    registerChaiAiCustomization("app", { prompt: (p) => `${p} [v1]` });
    registerChaiAiCustomization("app", { prompt: (p) => `${p} [v2]` });

    // Re-registering does not stack — the prompt is transformed once, latest wins.
    expect(await resolveChaiAiPrompt("base", info)).toBe("base [v2]");
  });

  it("supports async prompt customizers", async () => {
    registerChaiAiCustomization("app", { prompt: async (p) => `${p} [async]` });
    expect(await resolveChaiAiPrompt("base", info)).toBe("base [async]");
  });

  it("merges tool maps from every registered tools customizer", async () => {
    const fetchTool = { description: "fetch", execute: async () => "ok" };
    const searchTool = { description: "search", execute: async () => "ok" };
    registerChaiAiCustomization("a", { tools: () => ({ fetch_data: fetchTool }) as any });
    registerChaiAiCustomization("b", { tools: () => ({ search_docs: searchTool }) as any });

    const tools = await resolveChaiAiTools(info);
    expect(Object.keys(tools).sort()).toEqual(["fetch_data", "search_docs"]);
    expect(tools.fetch_data).toBe(fetchTool);
  });

  it("lets a later-registered name win on a tool key collision", async () => {
    registerChaiAiCustomization("a", { tools: () => ({ t: { description: "first" } }) as any });
    registerChaiAiCustomization("b", { tools: () => ({ t: { description: "second" } }) as any });

    const tools = await resolveChaiAiTools(info);
    expect((tools.t as { description: string }).description).toBe("second");
  });

  it("registers prompt and tools together from one call", async () => {
    registerChaiAiCustomization("app", {
      prompt: (p) => `${p} [both]`,
      tools: () => ({ t: { description: "d" } }) as any,
    });

    expect(await resolveChaiAiPrompt("base", info)).toBe("base [both]");
    expect(Object.keys(await resolveChaiAiTools(info))).toEqual(["t"]);
  });

  it("clears customizers on reset", async () => {
    registerChaiAiCustomization("app", { prompt: (p) => `${p} [x]`, tools: () => ({ t: {} }) as any });
    resetChaiAiCustomizersForTests();

    expect(await resolveChaiAiPrompt("base", info)).toBe("base");
    expect(await resolveChaiAiTools(info)).toEqual({});
  });
});
