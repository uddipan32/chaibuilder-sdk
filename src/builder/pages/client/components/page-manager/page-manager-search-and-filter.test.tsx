/**
 * @vitest-environment happy-dom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import PageManagerSearchAndFilter from "~/builder/pages/client/components/page-manager/page-manager-search-and-filter";
import { TooltipProvider } from "~/components/ui/tooltip";

const mockUsePageTypes = vi.fn();
const mockLayoutPagesEnabled = vi.fn(() => false);

vi.mock("~/builder/pages/hooks/project/use-page-types", () => ({
  usePageTypes: () => mockUsePageTypes(),
}));

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: (key: string, fallback: unknown) =>
    key === "flags.layoutPages" ? mockLayoutPagesEnabled() : fallback,
}));

vi.mock("~/builder/pages/hooks/utils/use-page-expand-manager", () => ({
  usePageExpandManager: () => ({
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    expandedPages: [],
  }),
}));

vi.mock("~/builder/pages/hooks/use-fallback-lang", () => ({
  useFallbackLang: () => "en",
}));

const renderPageManagerSearchAndFilter = (props: Partial<React.ComponentProps<typeof PageManagerSearchAndFilter>> = {}) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PageManagerSearchAndFilter
          pages={[]}
          search=""
          setSearch={vi.fn()}
          languages={["en"]}
          selectedLanguage="en"
          setSelectedLanguage={vi.fn()}
          selectedPageType="all"
          setSelectedPageType={vi.fn()}
          selectedTags={[]}
          setSelectedTags={vi.fn()}
          availableTags={[]}
          onAddPage={vi.fn()}
          showUntranslatedPages={false}
          setShowUntranslatedPages={vi.fn()}
          category="pages"
          setCategory={vi.fn()}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
};

describe("PageManagerSearchAndFilter", () => {
  beforeEach(() => {
    mockLayoutPagesEnabled.mockReturnValue(false);
  });

  it("shows a Layouts tab only when layout pages are enabled", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "global", name: "Global Block", hasSlug: false },
        { key: "_layout", name: "Layout", hasSlug: false },
      ],
    });

    const { rerender, queryByText } = renderPageManagerSearchAndFilter();
    expect(queryByText("Layouts")).toBeNull();

    mockLayoutPagesEnabled.mockReturnValue(true);
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <PageManagerSearchAndFilter
            pages={[]}
            search=""
            setSearch={vi.fn()}
            languages={["en"]}
            selectedLanguage="en"
            setSelectedLanguage={vi.fn()}
            selectedPageType="all"
            setSelectedPageType={vi.fn()}
            selectedTags={[]}
            setSelectedTags={vi.fn()}
            availableTags={[]}
            onAddPage={vi.fn()}
            showUntranslatedPages={false}
            setShowUntranslatedPages={vi.fn()}
            category="pages"
            setCategory={vi.fn()}
          />
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(queryByText("Layouts")).not.toBeNull();
  });


  it("seeds the add flow with the page type when adding a page", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "global", name: "Global", hasSlug: false },
      ],
    });
    const onAddPage = vi.fn();

    renderPageManagerSearchAndFilter({ category: "pages", onAddPage });
    fireEvent.click(screen.getByText("Add Page"));

    expect(onAddPage).toHaveBeenCalledWith({ pageType: "page" });
  });

  it("renders a create button on the partials tab that seeds the default partial type", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "global", name: "Global", hasSlug: false },
      ],
    });
    const onAddPage = vi.fn();

    renderPageManagerSearchAndFilter({ category: "partials", onAddPage });
    fireEvent.click(screen.getByText(/Create/));

    expect(onAddPage).toHaveBeenCalledWith({ pageType: "global" });
  });

  it("prefers a custom partial type when no global type exists", () => {
    mockUsePageTypes.mockReturnValue({
      data: [
        { key: "page", name: "Page", hasSlug: true },
        { key: "section", name: "Section", hasSlug: false },
      ],
    });
    const onAddPage = vi.fn();

    renderPageManagerSearchAndFilter({ category: "partials", onAddPage });
    fireEvent.click(screen.getByText(/Create/));

    expect(onAddPage).toHaveBeenCalledWith({ pageType: "section" });
  });

  it("hides the partials create button when no partial types exist", () => {
    mockUsePageTypes.mockReturnValue({
      data: [{ key: "page", name: "Page", hasSlug: true }],
    });

    renderPageManagerSearchAndFilter({ category: "partials" });

    expect(screen.queryByText(/Create/)).toBeNull();
  });
});
