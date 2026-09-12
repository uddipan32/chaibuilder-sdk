import { describe, expect, it } from "vitest";
import { DEFAULT_AI_CONFIG } from "./default-ai-config";
import { serializeAIConfigForClient } from "./serialize-ai-config";

describe("serializeAIConfigForClient", () => {
  it("keeps only plain data, dropping the server-only functions", () => {
    const serialized = serializeAIConfigForClient(DEFAULT_AI_CONFIG);

    expect(Object.keys(serialized).sort()).toEqual(["actionModels", "models"]);
    // The whole point: these close over server-side model clients and credentials.
    expect(serialized).not.toHaveProperty("resolveModel");
    expect(serialized).not.toHaveProperty("logging");
    expect(serialized).not.toHaveProperty("credits");
    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
  });

  it("carries the model fields the builder renders", () => {
    const serialized = serializeAIConfigForClient({
      ...DEFAULT_AI_CONFIG,
      models: [
        { id: "zai/glm-5.2", name: "GLM 5.2", provider: "zai", description: "3x Credits", multiplier: 3 },
        { id: "x/y", name: "Y", provider: "x", description: "1x", multiplier: 1, allowedFileTypes: [] },
      ],
      actionModels: { "zai/glm-5.2": ["AI_GENERATE_THEME"] },
    });

    expect(serialized.models[0]).toEqual({
      id: "zai/glm-5.2",
      name: "GLM 5.2",
      provider: "zai",
      description: "3x Credits",
      multiplier: 3,
    });
    // An explicit empty list means "no files", and must survive as an empty list.
    expect(serialized.models[1].allowedFileTypes).toEqual([]);
    expect(serialized.actionModels).toEqual({ "zai/glm-5.2": ["AI_GENERATE_THEME"] });
  });

  it("drops fields added to the server config until they are named here", () => {
    const serialized = serializeAIConfigForClient({
      ...DEFAULT_AI_CONFIG,
      models: [{ id: "a", name: "A", provider: "p", description: "d", multiplier: 1, secretKey: "leak" } as any],
    });

    expect(serialized.models[0]).not.toHaveProperty("secretKey");
  });
});
