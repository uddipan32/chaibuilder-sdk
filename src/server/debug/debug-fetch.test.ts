import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({
      info: mockInfo,
      success: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { setGlobalDebugLevel } from "./debug-level";
import { debugFetch } from "./debug-fetch";

describe("debugFetch", () => {
  beforeEach(() => {
    mockInfo.mockClear();
  });

  afterEach(() => {
    setGlobalDebugLevel(0);
    vi.restoreAllMocks();
  });

  it("does not log when debug level is 0", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    await debugFetch("https://example.com/image.jpg");

    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("logs fetch metadata when debug level is 1", async () => {
    setGlobalDebugLevel(1);
    global.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    await debugFetch("https://example.com/image.jpg");

    expect(mockInfo).toHaveBeenCalled();
  });
});
