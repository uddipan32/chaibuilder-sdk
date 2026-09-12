// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAI_CORE_VERSION } from "~/constants/VERSION";
import { logChaiCoreVersionBanner } from "./version-banner";

const BANNER_FLAG = "__chaiCoreVersionBannerPrinted__";

describe("logChaiCoreVersionBanner", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>)[BANNER_FLAG];
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    delete (window as unknown as Record<string, unknown>)[BANNER_FLAG];
  });

  it("prints the version and the plain-language notes", () => {
    logChaiCoreVersionBanner();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [format] = logSpy.mock.calls[0] as [string, ...string[]];
    expect(format).toContain("CHAIBUILDER CORE");
    expect(format).toContain(CHAI_CORE_VERSION);
    expect(format).toContain("Not a developer?");
    expect(format).toContain("Never paste code in here.");
  });

  it("passes one style argument per %c directive", () => {
    logChaiCoreVersionBanner();

    const [format, ...styles] = logSpy.mock.calls[0] as [string, ...string[]];
    expect(styles).toHaveLength(format.split("%c").length - 1);
  });

  it("only logs once per page load", () => {
    logChaiCoreVersionBanner();
    logChaiCoreVersionBanner();
    logChaiCoreVersionBanner();

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
