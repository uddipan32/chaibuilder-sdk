import type { ChaiTheme, ChaiThemePreset, ChaiThemePresetConfig } from "~/types/chaibuilder-editor-props";

const isThemePresetConfig = (
  value: Partial<ChaiTheme> | ChaiThemePresetConfig,
): value is ChaiThemePresetConfig => "theme" in value;

export const resolveThemePreset = (
  preset: ChaiThemePreset,
  name: string,
): ChaiThemePresetConfig | undefined => {
  const value = preset[name];
  if (!value || typeof value !== "object") return undefined;
  return isThemePresetConfig(value) ? value : { theme: value };
};
