/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import PagesManagerTrigger from "~/builder/pages/client/components/page-manager/page-manager-trigger";

const mockSetPageManager = vi.fn();
const mockSavePage = vi.fn();
const mockIsPublishing = vi.fn(() => false);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("~/builder/hooks/use-save-page", () => ({
  useSavePage: () => ({ savePage: mockSavePage }),
}));

vi.mock("~/builder/pages/atom/page-manager", () => ({
  useSetPageManagerAtom: () => mockSetPageManager,
}));

vi.mock("~/builder/pages/client/realtime", () => ({
  usePageLockStatus: () => ({ isLocked: false }),
}));

vi.mock("~/builder/pages/hooks/pages/mutations", () => ({
  useIsPublishing: () => mockIsPublishing(),
}));

describe("PagesManagerTrigger", () => {
  beforeEach(() => {
    mockSetPageManager.mockClear();
    mockSavePage.mockClear();
    mockIsPublishing.mockReturnValue(false);
  });

  it("opens the pages manager when no publish is running", () => {
    render(<PagesManagerTrigger />);

    const trigger = screen.getByRole<HTMLButtonElement>("button", { name: "Pages" });
    expect(trigger.disabled).toBe(false);

    fireEvent.click(trigger);
    expect(mockSetPageManager).toHaveBeenCalledWith(true);
  });

  it("disables the trigger while a publish is in flight", () => {
    mockIsPublishing.mockReturnValue(true);
    render(<PagesManagerTrigger />);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Pages" }).disabled).toBe(true);
  });

  it("does not open the pages manager while a publish is in flight", () => {
    mockIsPublishing.mockReturnValue(true);
    render(<PagesManagerTrigger />);

    fireEvent.click(screen.getByRole("button", { name: "Pages" }));

    expect(mockSetPageManager).not.toHaveBeenCalled();
    expect(mockSavePage).not.toHaveBeenCalled();
  });
});
