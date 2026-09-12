/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import PagesManagerSheet from "~/builder/pages/client/components/page-manager/page-manager-sheet";

// Hoisted: these are captured by the (hoisted) vi.mock factories below.
const { mockPrimaryPages, mockPanelMount, mockPanelUnmount } = vi.hoisted(() => ({
  mockPrimaryPages: vi.fn<() => { data: unknown[]; isFetching: boolean }>(),
  mockPanelMount: vi.fn(),
  mockPanelUnmount: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("~/builder/pages/atom/page-manager", () => ({
  usePageManagerAtom: () => [false, vi.fn()],
}));

vi.mock("~/builder/pages/hooks/utils/use-search-params", () => ({
  // No `?page=` in the URL: the sheet is force-open so the user can pick a page.
  useSearchParams: () => [new URLSearchParams(""), vi.fn()],
}));

vi.mock("~/builder/pages/hooks/pages/use-current-page", () => ({
  usePrimaryPage: () => ({ data: {}, isFetching: false }),
}));

vi.mock("~/builder/pages/hooks/pages/use-project-pages", () => ({
  useWebsitePrimaryPages: () => mockPrimaryPages(),
}));

vi.mock("~/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div data-testid="sheet" data-open={open ? "true" : "false"}>
      {open ? children : null}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./page-manager-new", async () => {
  const { useEffect } = await import("react");
  return {
    default: () => {
      useEffect(() => {
        mockPanelMount();
        return () => mockPanelUnmount();
      }, []);
      return <div data-testid="pages-manager-new" />;
    },
  };
});

describe("PagesManagerSheet", () => {
  beforeEach(() => {
    mockPrimaryPages.mockReset();
    mockPanelMount.mockClear();
    mockPanelUnmount.mockClear();
  });

  it("stays open (and keeps the panel mounted) across a later pages refetch", async () => {
    // Initial load in flight: nothing to show yet.
    mockPrimaryPages.mockReturnValue({ data: [], isFetching: true });
    const { rerender } = render(<PagesManagerSheet />);
    expect(screen.getByTestId("sheet").dataset.open).toBe("false");

    // Initial load done, no page selected → forced open.
    mockPrimaryPages.mockReturnValue({ data: [{ id: "a" }], isFetching: false });
    rerender(<PagesManagerSheet />);
    expect(await screen.findByTestId("pages-manager-new")).toBeTruthy();
    expect(mockPanelMount).toHaveBeenCalledTimes(1);

    // A rename / refresh invalidates GET_WEBSITE_PAGES → refetch. This is NOT an
    // initial load any more: the sheet must not close and remount its panel.
    mockPrimaryPages.mockReturnValue({ data: [{ id: "a" }], isFetching: true });
    rerender(<PagesManagerSheet />);
    expect(screen.getByTestId("sheet").dataset.open).toBe("true");
    expect(screen.getByTestId("pages-manager-new")).toBeTruthy();
    expect(mockPanelUnmount).not.toHaveBeenCalled();

    mockPrimaryPages.mockReturnValue({ data: [{ id: "a", name: "renamed" }], isFetching: false });
    rerender(<PagesManagerSheet />);
    expect(screen.getByTestId("sheet").dataset.open).toBe("true");
    expect(mockPanelMount).toHaveBeenCalledTimes(1);
    expect(mockPanelUnmount).not.toHaveBeenCalled();
  });
});
