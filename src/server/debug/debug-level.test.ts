import { afterEach, describe, expect, it } from "vitest";
import {
  getDebugLevel,
  getGlobalDebugLevel,
  runWithDebugLevel,
  setGlobalDebugLevel,
} from "./debug-level";

describe("debug-level", () => {
  afterEach(() => {
    setGlobalDebugLevel(0);
  });

  it("defaults to global level 0", () => {
    expect(getGlobalDebugLevel()).toBe(0);
    expect(getDebugLevel()).toBe(0);
  });

  it("uses global debug level when no request context is active", () => {
    setGlobalDebugLevel(2);
    expect(getDebugLevel()).toBe(2);
  });

  it("prefers request-scoped debug level over global fallback", () => {
    setGlobalDebugLevel(0);
    runWithDebugLevel(1, () => {
      expect(getDebugLevel()).toBe(1);
    });
    expect(getDebugLevel()).toBe(0);
  });
});
