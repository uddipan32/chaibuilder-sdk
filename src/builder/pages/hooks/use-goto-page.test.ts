/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { useGotoPage } from "~/builder/pages/hooks/use-goto-page";

const mockChangePage = vi.fn();
const mockUpdateBlockIdInUrl = vi.fn();
const mockIsPublishing = vi.fn(() => false);

vi.mock("~/builder/pages/hooks/use-change-page", () => ({
  useChangePage: () => mockChangePage,
}));

vi.mock("~/builder/hooks/use-block-selection-query-sync", () => ({
  updateBlockIdInUrl: (blockId: string | null) => mockUpdateBlockIdInUrl(blockId),
}));

vi.mock("~/builder/pages/hooks/pages/mutations", () => ({
  useIsPublishing: () => mockIsPublishing(),
}));

describe("useGotoPage", () => {
  beforeEach(() => {
    mockChangePage.mockClear();
    mockUpdateBlockIdInUrl.mockClear();
    mockIsPublishing.mockReturnValue(false);
  });

  it("navigates to the requested page", () => {
    const { result } = renderHook(() => useGotoPage());

    result.current({ pageId: "page-2", blockId: "block-1" });

    expect(mockChangePage).toHaveBeenCalledWith("page-2");
    expect(mockUpdateBlockIdInUrl).toHaveBeenCalledWith("block-1");
  });

  it("does not switch pages while a publish is in flight", () => {
    mockIsPublishing.mockReturnValue(true);
    const { result } = renderHook(() => useGotoPage());

    result.current({ pageId: "page-2" });

    expect(mockChangePage).not.toHaveBeenCalled();
    expect(mockUpdateBlockIdInUrl).not.toHaveBeenCalled();
  });
});
