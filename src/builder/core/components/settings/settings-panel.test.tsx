/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const gotoPage = vi.fn();
const savePageAsync = vi.fn().mockResolvedValue(true);
const saveState = { current: "UNSAVED" as "SAVED" | "SAVING" | "UNSAVED" };
const toastError = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: (prop: string) => (prop === "gotoPage" ? gotoPage : vi.fn()),
}));
vi.mock("~/builder/hooks/use-save-page", () => ({
  useSavePage: () => ({ saveState: saveState.current, savePageAsync }),
}));
vi.mock("~/builder/hooks/use-languages", () => ({
  useLanguages: () => ({ selectedLang: "en", fallbackLang: "en" }),
}));
vi.mock("~/builder/hooks/use-selected-blockIds", () => ({
  useSelectedBlock: () => ({ _type: "PartialBlock", partialBlockId: "partial-1" }),
}));
vi.mock("~/builder/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock("~/builder/hooks/use-theme", () => ({
  useActiveSettingsTab: () => ["settings", vi.fn()],
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

const SettingsPanel = (await import("./settings-panel")).default;

const doubleClickPartial = () => {
  render(<SettingsPanel />);
  fireEvent.doubleClick(screen.getByText("Partial block. Double click to edit."));
};

describe("SettingsPanel - double click a partial block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePageAsync.mockResolvedValue(true);
    saveState.current = "UNSAVED";
  });

  it("saves the page then navigates when there are unsaved changes", async () => {
    doubleClickPartial();

    await waitFor(() => expect(gotoPage).toHaveBeenCalledWith({ pageId: "partial-1", lang: "en" }));
    expect(savePageAsync).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("navigates without saving when the page is already saved", async () => {
    saveState.current = "SAVED";

    doubleClickPartial();

    await waitFor(() => expect(gotoPage).toHaveBeenCalledTimes(1));
    expect(savePageAsync).not.toHaveBeenCalled();
  });

  it("stays on the page when the save fails", async () => {
    savePageAsync.mockRejectedValue(new Error("save failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    doubleClickPartial();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(gotoPage).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
