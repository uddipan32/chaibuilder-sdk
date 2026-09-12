// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { requestChaiPanelClose } from "~/builder/hooks/use-panel-close-guard";
import SeoPanel from "./seo-panel";

type Seo = Record<string, unknown>;

const state = vi.hoisted(() => ({
  seo: {} as Seo,
  selectedLang: "",
  saves: [] as { values: Seo; onSuccess?: () => void; onError?: () => void }[],
}));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("~/builder/hooks/use-languages", () => ({
  useLanguages: () => ({ selectedLang: state.selectedLang, fallbackLang: "en" }),
}));
vi.mock("~/builder/hooks/use-permissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock("~/builder/core/rjsf-widgets/binding-editor/binding-editor-widget", () => ({
  BindingTextField: () => null,
  useBindingInputEnabled: () => false,
}));
vi.mock("~/builder/core/components/nested-path-selector", () => ({
  NestedPathSelector: () => null,
}));
vi.mock("~/builder/pages/digital-asset-manager", () => ({ ImagePicker: () => null }));
vi.mock("./key-value-editor", () => ({ KeyValueEditor: () => null }));
// The close warning is driven through this stub so tests can pick save vs. discard.
vi.mock("./seo-language-switch-dialog", () => ({
  SeoLanguageSwitchDialog: () => null,
  SeoUnsavedChangesDialog: ({
    isOpen,
    onSave,
    onDiscard,
  }: {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
  }) =>
    isOpen ? (
      <div data-testid="unsaved-dialog">
        <button type="button" data-testid="unsaved-save" onClick={onSave}>
          save
        </button>
        <button type="button" data-testid="unsaved-discard" onClick={onDiscard}>
          discard
        </button>
      </div>
    ) : null,
}));
vi.mock("./seo-search-preview", () => ({ SeoSearchPreview: () => null }));
vi.mock("./smart-json-input", () => ({ SmartJsonInput: () => null }));
vi.mock("./topbar-left", () => ({ LanguageSwitcher: () => null }));

vi.mock("~/builder/pages/hooks/pages/use-current-page", () => ({
  usePrimaryPage: () => ({ data: { id: "page-1", pageType: "page" } }),
}));
vi.mock("~/builder/pages/hooks/pages/use-current-language-page", () => ({
  useCurrentLanguagePage: () => ({
    data: { id: `lang-page-${state.selectedLang || "en"}`, slug: "/", seo: state.seo },
    isFetching: false,
  }),
}));
vi.mock("~/builder/pages/hooks/pages/use-language-pages", () => ({ useLanguagePages: () => ({ data: [] }) }));
vi.mock("~/builder/pages/hooks/pages/use-builder-page-props", () => ({ useBuilderPageProps: () => ({}) }));
vi.mock("~/builder/pages/hooks/pages/use-page-draft-blocks", () => ({ useBuilderPageData: () => ({ data: {} }) }));
vi.mock("~/builder/pages/hooks/pages/use-site-global-data", () => ({ useSiteGlobalData: () => ({ data: {} }) }));
vi.mock("~/builder/pages/hooks/project/use-page-types", () => ({ usePageType: () => ({ key: "page" }) }));
vi.mock("~/builder/pages/hooks/utils/use-pages-props", () => ({ usePagesProps: () => [{}] }));

// Records each save and hands back its callbacks so a test can decide when the
// mutation resolves — that gap is where the hydration race lives.
vi.mock("~/builder/pages/hooks/pages/mutations", () => ({
  useUpdatePage: () => ({
    mutate: (payload: { seo: Seo }, options?: { onSuccess?: () => void; onError?: () => void }) => {
      state.saves.push({ values: payload.seo, onSuccess: options?.onSuccess, onError: options?.onError });
    },
    isPending: false,
  }),
}));

const seoTitleInput = () => document.getElementById("title") as HTMLInputElement;
const seoDescriptionInput = () => document.getElementById("description") as HTMLTextAreaElement;
const ogTitleInput = () => document.getElementById("ogTitle") as HTMLInputElement;

const generate = (field: string) => fireEvent.click(screen.getByTestId(`generate-${field}`));
const saveButton = () => screen.getByRole("button", { name: "Save" });
const type = (element: HTMLInputElement | HTMLTextAreaElement, value: string) =>
  fireEvent.change(element, { target: { value } });

// Stands in for the pro AI generate button: clicking it applies a generated value.
vi.mock("~/builder/register-apis", () => ({
  CHAI_SLOT_IDS: {
    SEO_PANEL: { TRIGGER: "seo-panel-trigger", CONTENT: "seo-panel-content" },
    SEO_FIELD_ACTIONS: "seo-field-actions",
  },
  ChaiSlot: ({ context }: { context?: { field?: string; onApply?: (value: string) => void } }) =>
    context?.field ? (
      <button type="button" data-testid={`generate-${context.field}`} onClick={() => context.onApply?.(`AI ${context.field}`)}>
        generate
      </button>
    ) : null,
}));

describe("SeoPanel saving", () => {
  beforeEach(() => {
    state.seo = { title: "", description: "" };
    state.selectedLang = "";
    state.saves = [];
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("does not save until Save is clicked", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    expect(state.saves).toHaveLength(0);

    fireEvent.click(saveButton());
    expect(state.saves).toHaveLength(1);
    expect(state.saves[0]?.values.title).toBe("Edited title");
  });

  it("keeps edits made on other tabs and saves them together", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    fireEvent.click(screen.getByRole("tab", { name: "Meta Tags" }));
    type(ogTitleInput(), "Edited OG title");

    // Switching back shows the earlier edit — no tab unmounts the form.
    fireEvent.click(screen.getByRole("tab", { name: "SEO" }));
    expect(seoTitleInput().value).toBe("Edited title");

    fireEvent.click(saveButton());
    expect(state.saves).toHaveLength(1);
    expect(state.saves[0]?.values).toMatchObject({ title: "Edited title", ogTitle: "Edited OG title" });
  });

  it("toasts and disables Save once the save succeeds", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    fireEvent.click(saveButton());
    expect(toast.success).not.toHaveBeenCalled();

    act(() => {
      state.saves.at(-1)?.onSuccess?.();
    });

    expect(toast.success).toHaveBeenCalledWith("SEO & JSON-LD updated successfully");
    expect(saveButton()).toHaveProperty("disabled", true);
  });

  it("toasts on a failed save and keeps the edits", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    fireEvent.click(saveButton());

    act(() => {
      state.saves.at(-1)?.onError?.();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update SEO & JSON-LD");
    expect(seoTitleInput().value).toBe("Edited title");
    expect(saveButton()).toHaveProperty("disabled", false);
  });
});

describe("SeoPanel close guard", () => {
  beforeEach(() => {
    state.seo = { title: "", description: "" };
    state.selectedLang = "";
    state.saves = [];
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("closes straight away with no unsaved changes", () => {
    render(<SeoPanel />);

    const proceed = vi.fn();
    act(() => requestChaiPanelClose("seo", proceed));

    expect(proceed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("unsaved-dialog")).toBeNull();
  });

  it("warns instead of closing when there are unsaved changes", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");

    const proceed = vi.fn();
    act(() => requestChaiPanelClose("seo", proceed));

    expect(proceed).not.toHaveBeenCalled();
    expect(screen.getByTestId("unsaved-dialog")).toBeTruthy();
  });

  it("saves then closes when the warning is accepted", async () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    const proceed = vi.fn();
    act(() => requestChaiPanelClose("seo", proceed));

    fireEvent.click(screen.getByTestId("unsaved-save"));
    expect(state.saves.at(-1)?.values.title).toBe("Edited title");
    // Still open — the panel closes only once the save comes back.
    expect(proceed).not.toHaveBeenCalled();

    await act(async () => {
      state.saves.at(-1)?.onSuccess?.();
    });

    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it("restores the saved values and closes on discard", () => {
    render(<SeoPanel />);

    type(seoTitleInput(), "Edited title");
    const proceed = vi.fn();
    act(() => requestChaiPanelClose("seo", proceed));

    fireEvent.click(screen.getByTestId("unsaved-discard"));

    expect(state.saves).toHaveLength(0);
    expect(seoTitleInput().value).toBe("");
    expect(proceed).toHaveBeenCalledTimes(1);
  });
});

describe("SeoPanel server hydration", () => {
  beforeEach(() => {
    state.seo = { title: "", description: "" };
    state.selectedLang = "";
    state.saves = [];
  });

  it("keeps a field generated while an earlier save is in flight", () => {
    const { rerender } = render(<SeoPanel />);

    generate("title");
    expect(seoTitleInput().value).toBe("AI title");
    fireEvent.click(saveButton());
    const titleSave = state.saves.at(-1);
    expect(titleSave?.values.title).toBe("AI title");

    // Description is generated before the title's save has come back.
    generate("description");
    expect(seoDescriptionInput().value).toBe("AI description");

    // The title save resolves and its invalidation refetches the page — the server row
    // only knows about the title.
    act(() => {
      state.seo = { title: "AI title", description: "" };
      titleSave?.onSuccess?.();
    });
    rerender(<SeoPanel />);

    expect(seoTitleInput().value).toBe("AI title");
    expect(seoDescriptionInput().value).toBe("AI description");
  });

  it("takes server values on a refetch with no unsaved edits", () => {
    const { rerender } = render(<SeoPanel />);

    act(() => {
      state.seo = { title: "Title from another editor", description: "Description from another editor" };
    });
    rerender(<SeoPanel />);

    expect(seoTitleInput().value).toBe("Title from another editor");
    expect(seoDescriptionInput().value).toBe("Description from another editor");
  });

  it("takes server values when the language changes, even with unsaved edits", () => {
    const { rerender } = render(<SeoPanel />);

    generate("title");
    expect(seoTitleInput().value).toBe("AI title");

    act(() => {
      state.selectedLang = "es";
      state.seo = { title: "Título", description: "Descripción" };
    });
    rerender(<SeoPanel />);

    expect(seoTitleInput().value).toBe("Título");
    expect(seoDescriptionInput().value).toBe("Descripción");
  });
});
