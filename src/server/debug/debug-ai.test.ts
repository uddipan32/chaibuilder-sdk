import { afterEach, describe, expect, it, vi } from "vitest";

const { mockInfo, mockDebug } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockDebug: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: mockInfo,
      success: vi.fn(),
      warn: vi.fn(),
      debug: mockDebug,
      error: vi.fn(),
    }),
  },
}));

import { setGlobalDebugLevel } from "./debug-level";
import { sanitizeAiLogText, summarizeAiMessages, withAiDebugPhase } from "./debug-ai";
import { logAi } from "./debug-log";

describe("debug-ai", () => {
  afterEach(() => {
    setGlobalDebugLevel(0);
    mockInfo.mockClear();
    mockDebug.mockClear();
  });

  it("sanitizeAiLogText replaces base64 data URIs", () => {
    const input = `before data:image/png;base64,${"A".repeat(200)} after`;
    const result = sanitizeAiLogText(input, 200);
    expect(result).toContain("[data-uri]");
    expect(result).not.toContain("base64");
  });

  it("summarizeAiMessages returns message count", () => {
    expect(summarizeAiMessages([{ role: "user" }, { role: "assistant" }])).toBe("messages=2");
  });

  it("withAiDebugPhase does not log at level 0", async () => {
    const result = await withAiDebugPhase("AI_EDIT_PAGE", "generateText", async () => "ok");
    expect(result).toBe("ok");
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("withAiDebugPhase logs phase start at level 1", async () => {
    setGlobalDebugLevel(1);

    const result = await withAiDebugPhase("AI_EDIT_PAGE", "generateText", async () => "ok");

    expect(result).toBe("ok");
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("▶ ai:AI_EDIT_PAGE"));
    expect(mockInfo.mock.calls[0][0]).toContain("generateText");
  });

  it("logAi includes action name when 4th arg provided", () => {
    setGlobalDebugLevel(1);

    logAi("gpt-4o", 120, "generateText", "AI_EDIT_PAGE");

    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("AI_EDIT_PAGE · gpt-4o"));
  });
});
