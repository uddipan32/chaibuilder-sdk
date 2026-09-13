// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAI_VERSION } from "~/constants/VERSION";
import { CHAI_EDITION_LABEL } from "~/edition/identity";
import { logChaiVersionBanner } from "./version-banner";

const BANNER_FLAG = "__chaiVersionBannerPrinted__";

describe("logChaiVersionBanner", () => {
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
    logChaiVersionBanner();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [format] = logSpy.mock.calls[0] as [string, ...string[]];
    expect(format).toContain(`CHAIBUILDER ${CHAI_EDITION_LABEL}`);
    expect(format).toContain(CHAI_VERSION);
    expect(format).toContain("Not a developer?");
    expect(format).toContain("Never paste code in here.");
  });

  it("passes one style argument per %c directive", () => {
    logChaiVersionBanner();

    const [format, ...styles] = logSpy.mock.calls[0] as [string, ...string[]];
    expect(styles).toHaveLength(format.split("%c").length - 1);
  });

  it("only logs once per page load", () => {
    logChaiVersionBanner();
    logChaiVersionBanner();
    logChaiVersionBanner();

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
