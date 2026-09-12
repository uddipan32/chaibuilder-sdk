/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { isPageLoadedAtom } from "~/builder/hooks/use-is-page-loaded";
import TopbarRight from "~/builder/pages/client/components/topbar-right";

const mockPublishPage = vi.fn();
const mockIsPending = vi.fn(() => false);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("~/builder/pages/client/realtime", () => ({
  usePageLockStatus: () => ({ isLocked: false }),
}));

vi.mock("~/builder/pages/hooks/utils/use-search-params", () => ({
  useSearchParams: () => [new URLSearchParams("page=page-1"), vi.fn()],
}));

vi.mock("~/builder/pages/hooks/pages/use-is-languagep-page-created", () => ({
  useIsLanguagePageCreated: () => true,
}));

vi.mock("~/builder/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("~/builder/hooks/use-theme", () => ({
  useRightPanel: () => ["block", vi.fn()],
}));

vi.mock("~/builder/hooks/use-languages", () => ({
  useLanguages: () => ({ selectedLang: "", fallbackLang: "en" }),
}));

vi.mock("~/builder/hooks/use-save-page", () => ({
  useSavePage: () => ({ savePageAsync: vi.fn(), saveState: "SAVED", needTranslations: () => false }),
}));

vi.mock("~/builder/hooks/use-structure-validation", () => ({
  useStructureValidation: () => ({ errors: [], hasErrors: false, hasWarnings: false }),
}));

vi.mock("~/builder/pages/hooks/pages/use-current-page", () => ({
  useCurrentActivePage: () => ({ data: { id: "page-1" } }),
  usePrimaryPage: () => ({ data: { id: "page-1", online: false } }),
  useGetPageFullSlug: () => "/",
  useGetPagePreviewUrl: () => "/preview",
}));

vi.mock("~/builder/pages/hooks/pages/use-get-unpublished-partial-blocks", () => ({
  useGetUnpublishedPartialBlocks: () => () => ({ ids: [], names: [], partialBlocksInfo: [] }),
}));

vi.mock("~/builder/pages/hooks/pages/mutations", () => ({
  usePublishPages: () => ({ mutate: mockPublishPage, isPending: mockIsPending() }),
}));

vi.mock("~/builder/pages/hooks/project/use-builder-prop", () => ({
  usePagesProp: (_key: string, fallback: unknown) => fallback,
}));

vi.mock("~/builder/pages/hooks/project/use-unpublished-website-settings", () => ({
  useUnpublishedWebsiteSettings: () => ({
    hasUnpublishedSettings: false,
    hasUnpublishedTheme: false,
    hasUnpublishedDesignToken: false,
  }),
}));

vi.mock("~/builder/pages/client/components/publish-pages/publish-pages", () => ({ default: () => null }));

vi.mock("~/builder/core/components/canvas/topbar/validation-errors-modal", () => ({
  ValidationErrorsModal: () => null,
}));

vi.mock("~/builder/register-apis", () => ({ ChaiSlot: () => null }));

vi.mock("~/builder/pages/utils/tooltip", () => ({ default: ({ children }: any) => children }));

const renderTopbarRight = (isPageLoaded: boolean) => {
  const store = createStore();
  store.set(isPageLoadedAtom, isPageLoaded);
  return render(
    <Provider store={store}>
      <TopbarRight />
    </Provider>,
  );
};

describe("TopbarRight publish button", () => {
  beforeEach(() => {
    mockPublishPage.mockClear();
    mockIsPending.mockReturnValue(false);
  });

  it("disables publish while the page is still loading", () => {
    renderTopbarRight(false);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Publish" }).disabled).toBe(true);
  });

  it("disables the publish dropdown while the page is still loading", () => {
    const { container } = renderTopbarRight(false);

    const trigger = container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');
    expect(trigger?.disabled).toBe(true);
  });

  it("enables publish once the page is loaded", () => {
    renderTopbarRight(true);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Publish" }).disabled).toBe(false);
  });
});
