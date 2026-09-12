// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChaiDesignTokens, ChaiTheme, ChaiThemePreset } from "~/types";
import ThemeConfigPanel from "./theme-config-panel";

const state = vi.hoisted(() => ({
  themePresets: [] as ChaiThemePreset[],
  theme: {} as ChaiTheme,
  designTokens: {} as ChaiDesignTokens,
  setTheme: vi.fn(),
  setDesignTokens: vi.fn(),
  saveThemeAndDesignTokens: vi.fn(),
  debouncedSaveTheme: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@react-hookz/web", () => ({ useDebouncedCallback: (callback: unknown) => callback }));
vi.mock("jotai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jotai")>()),
  useAtom: () => [state.designTokens, state.setDesignTokens],
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));
vi.mock("sonner", () => ({
  toast: {
    dismiss: vi.fn(),
    error: state.toastError,
    success: vi.fn(),
  },
}));
vi.mock("~/builder/core/components/sidepanels/panels/theme-configuration", () => ({
  BorderRadiusInput: () => null,
  ColorPickerInput: () => null,
  FontSelector: () => null,
}));
vi.mock("~/builder/core/functions/common-functions", () => ({ cn: (...values: string[]) => values.join(" ") }));
vi.mock("~/builder/hooks/use-builder-prop", () => ({
  useBuilderProp: (key: string, fallback: unknown) => {
    if (key === "themePresets") return state.themePresets;
    if (key === "flags.importTheme" || key === "flags.darkMode" || key === "flags.ai") return false;
    return fallback;
  },
}));
vi.mock("~/builder/hooks/use-dark-mode", () => ({ useDarkMode: () => [false, vi.fn()] }));
vi.mock("~/builder/hooks/use-permissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock("~/builder/hooks/use-save-website-data", () => ({
  useSaveWebsiteData: () => ({
    debouncedSaveTheme: state.debouncedSaveTheme,
    saveThemeAndDesignTokens: state.saveThemeAndDesignTokens,
  }),
}));
vi.mock("~/builder/hooks/use-theme", () => ({
  useTheme: () => [state.theme, state.setTheme],
  useThemeOptions: () => ({ fontFamily: false, borderRadius: false, colors: [] }),
}));
vi.mock("~/builder/register-apis", () => ({ ChaiSlot: () => null }));
vi.mock("~/components/ui/button", () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock("~/components/ui/input", () => ({ Input: () => null }));
vi.mock("~/components/ui/label", () => ({
  Label: (props: HTMLAttributes<HTMLLabelElement>) => <label {...props} />,
}));
vi.mock("~/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select aria-label="Theme preset" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => children,
  SelectValue: () => null,
}));
vi.mock("~/components/ui/separator", () => ({ Separator: () => null }));
vi.mock("~/components/ui/switch", () => ({ Switch: () => null }));
vi.mock("~/registry", () => ({ useRegisteredFonts: () => [] }));

const currentTheme = {
  fontFamily: { heading: "Arial", body: "Arial" },
  borderRadius: "4px",
  colors: {},
} as ChaiTheme;
const presetTheme = {
  fontFamily: { heading: "Inter", body: "Inter" },
  borderRadius: "12px",
  colors: {},
} as ChaiTheme;
const currentTokens = {
  "dt#input": { name: "Input", value: "h-8 rounded-md" },
  "dt#card": { name: "Card", value: "rounded-xl shadow" },
};
const presetTokens = {
  "dt#card": { name: "Card", value: "rounded-none border-2 shadow-none" },
};

describe("ThemeConfigPanel presets", () => {
  beforeEach(() => {
    state.theme = currentTheme;
    state.designTokens = currentTokens;
    state.themePresets = [{ editorial: { theme: presetTheme, designTokens: presetTokens } }];
    state.setTheme.mockReset();
    state.setDesignTokens.mockReset();
    state.saveThemeAndDesignTokens.mockReset().mockResolvedValue(undefined);
    state.debouncedSaveTheme.mockReset();
    state.toastError.mockReset();
  });

  it("applies and saves preset theme and design-token overrides together", async () => {
    render(<ThemeConfigPanel />);
    fireEvent.change(screen.getByLabelText("Theme preset"), { target: { value: "editorial" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const nextTokens = { ...currentTokens, ...presetTokens };
    await waitFor(() => expect(state.saveThemeAndDesignTokens).toHaveBeenCalledWith(presetTheme, nextTokens));
    expect(state.setTheme).toHaveBeenCalledWith(presetTheme);
    expect(state.setDesignTokens).toHaveBeenCalledWith(nextTokens);
  });

  it("restores previous theme and tokens when combined save fails", async () => {
    state.saveThemeAndDesignTokens.mockRejectedValueOnce(new Error("save failed"));
    render(<ThemeConfigPanel />);
    fireEvent.change(screen.getByLabelText("Theme preset"), { target: { value: "editorial" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(state.toastError).toHaveBeenCalledWith("Failed to update theme"));
    expect(state.setTheme).toHaveBeenLastCalledWith(currentTheme);
    expect(state.setDesignTokens).toHaveBeenLastCalledWith(currentTokens);
  });
});
