// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveWebsiteData } from "./use-save-website-data";

const { onSaveWebsiteData } = vi.hoisted(() => ({ onSaveWebsiteData: vi.fn() }));

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: () => onSaveWebsiteData,
}));

vi.mock("~/builder/hooks/use-theme", () => ({
  useTheme: () => [{ fontFamily: { heading: "Arial", body: "Arial" }, borderRadius: "8px", colors: {} }],
}));

vi.mock("~/builder/atoms/builder", () => ({ chaiDesignTokensAtom: {} }));
vi.mock("~/builder/atoms/store", () => ({ builderStore: { get: () => ({}) } }));

describe("useSaveWebsiteData", () => {
  beforeEach(() => onSaveWebsiteData.mockReset());

  it("sends theme and tokens in one combined save", async () => {
    onSaveWebsiteData.mockResolvedValue(true);
    const { result } = renderHook(() => useSaveWebsiteData());
    const theme = { fontFamily: { heading: "Arial", body: "Arial" }, borderRadius: "8px", colors: {} } as any;
    const designTokens = { "dt#card": { name: "Card", value: "rounded-lg" } };

    await act(() => result.current.saveThemeAndDesignTokens(theme, designTokens));

    expect(onSaveWebsiteData).toHaveBeenCalledWith({
      type: "THEME_AND_DESIGN_TOKENS",
      data: { theme, designTokens },
    });
  });

  it("queues saves instead of dropping a request while another save is active", async () => {
    let releaseFirst!: () => void;
    onSaveWebsiteData
      .mockImplementationOnce(() => new Promise<void>((resolve) => (releaseFirst = resolve)))
      .mockResolvedValueOnce(true);
    const { result } = renderHook(() => useSaveWebsiteData());

    const first = result.current.saveWebsiteData({ type: "DESIGN_TOKENS", data: {} });
    const second = result.current.saveWebsiteData({ type: "DESIGN_TOKENS", data: {} });
    await waitFor(() => expect(onSaveWebsiteData).toHaveBeenCalledTimes(1));

    releaseFirst();
    await act(async () => {
      await first;
      await second;
    });
    expect(onSaveWebsiteData).toHaveBeenCalledTimes(2);
  });
});
