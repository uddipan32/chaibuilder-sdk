import { MixerHorizontalIcon, MoonIcon, ResetIcon, SunIcon, TextIcon } from "@radix-ui/react-icons";
import { useDebouncedCallback } from "@react-hookz/web";
import { useAtom } from "jotai";
import { capitalize, cloneDeep, get, set } from "lodash-es";
import { SquareRoundCorner } from "lucide-react";
import * as React from "react";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { chaiDesignTokensAtom } from "~/builder/atoms/builder";
import {
  BorderRadiusInput,
  ColorPickerInput,
  FontSelector,
} from "~/builder/core/components/sidepanels/panels/theme-configuration";
import { cn } from "~/builder/core/functions/common-functions";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useDarkMode } from "~/builder/hooks/use-dark-mode";
import { usePermissions } from "~/builder/hooks/use-permissions";
import { useSaveWebsiteData } from "~/builder/hooks/use-save-website-data";
import { useTheme, useThemeOptions } from "~/builder/hooks/use-theme";
import { ChaiSlot } from "~/builder/register-apis";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { CHAI_SLOT_IDS } from "~/constants/CHAI_SLOT_IDS";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { claude, defaultShadcnPreset, solarized, supabase, twitter } from "~/constants/THEME_PRESETS";
import { useRegisteredFonts } from "~/registry";
import type { ChaiTheme, ChaiThemePreset } from "~/types/chaibuilder-editor-props";
import type { ChaiDesignTokens } from "~/types/types";
import { resolveThemePreset } from "./theme-preset";

const LazyCssImportModal = lazy(() =>
  import("./css-import-modal").then((module) => ({
    default: module.CssImportModal,
  })),
);

// Local storage key for storing previous theme
const PREV_THEME_KEY = "chai-builder-previous-theme";

// Default theme preset
const DEFAULT_THEME_PRESET: ChaiThemePreset[] = [
  { shadcn_default: defaultShadcnPreset },
  { twitter_theme: twitter },
  { solarized_theme: solarized },
  { claude_theme: claude },
  { supabase_theme: supabase },
];

const setPreviousTheme = (theme: ChaiTheme) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREV_THEME_KEY, JSON.stringify(theme));
  } catch (error) {
    console.warn("Failed to save previous theme to localStorage:", error);
  }
};

const clearPreviousTheme = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREV_THEME_KEY);
  } catch (error) {
    console.warn("Failed to clear previous theme from localStorage:", error);
  }
};

interface ThemeConfigProps {
  className?: string;
}

const isCompleteTheme = (value: Partial<ChaiTheme> | undefined): value is ChaiTheme =>
  Boolean(
    value &&
      typeof value === "object" &&
      "fontFamily" in value &&
      "borderRadius" in value &&
      "colors" in value,
  );

const ThemeConfigPanel: React.FC<ThemeConfigProps> = React.memo(({ className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const configuredThemePresets = useBuilderProp("themePresets", []) as ChaiThemePreset[];
  const themePresets = configuredThemePresets.length > 0 ? configuredThemePresets : DEFAULT_THEME_PRESET;
  const { hasPermission } = usePermissions();
  const { debouncedSaveTheme, saveThemeAndDesignTokens } = useSaveWebsiteData();
  const importThemeEnabled = useBuilderProp("flags.importTheme", true);
  const darkModeEnabled = useBuilderProp("flags.darkMode", false);
  const availableFonts = useRegisteredFonts();
  const isAiEnabled = useBuilderProp("flags.ai", false);

  const [themeValues, setThemeValues] = useTheme();
  const [designTokens, setDesignTokens] = useAtom(chaiDesignTokensAtom);
  const chaiThemeOptions = useThemeOptions();
  const { t } = useTranslation();
  const setThemeWithHistory = React.useCallback(
    (newTheme: ChaiTheme) => {
      const previousTheme = { ...themeValues };
      setPreviousTheme(previousTheme);
      setThemeValues(newTheme);
      debouncedSaveTheme();
      toast.success("Theme updated", {
        action: {
          label: (
            <span className="flex items-center gap-2">
              <ResetIcon className="h-4 w-4" /> Undo
            </span>
          ),
          onClick: () => {
            setThemeValues(previousTheme);
            clearPreviousTheme();
            toast.dismiss();
          },
        },
        closeButton: true,
        duration: 15000,
      });
    },
    [themeValues, setThemeValues, debouncedSaveTheme],
  );

  const handleCssImport = (importedTheme: ChaiTheme) => {
    // Apply the imported theme values directly to the current theme
    setThemeWithHistory(importedTheme);
    setSelectedPreset("");
  };

  const applyThemeAndDesignTokens = React.useCallback(
    async ({ theme, designTokenOverrides }: { theme: ChaiTheme; designTokenOverrides: ChaiDesignTokens }) => {
      const previousTheme = cloneDeep(themeValues);
      const previousDesignTokens = cloneDeep(designTokens);
      const nextTheme = cloneDeep(theme);
      const nextDesignTokens = { ...designTokens, ...designTokenOverrides };

      setThemeValues(nextTheme);
      setDesignTokens(nextDesignTokens);

      try {
        await saveThemeAndDesignTokens(nextTheme, nextDesignTokens);
      } catch (error) {
        setThemeValues(previousTheme);
        setDesignTokens(previousDesignTokens);
        throw error;
      }

      setSelectedPreset("");
      toast.success(t("Theme and component styles updated"), {
        action: {
          label: (
            <span className="flex items-center gap-2">
              <ResetIcon className="h-4 w-4" /> {t("Undo")}
            </span>
          ),
          onClick: () => {
            setThemeValues(previousTheme);
            setDesignTokens(previousDesignTokens);
            saveThemeAndDesignTokens(previousTheme, previousDesignTokens).catch(() => {
              setThemeValues(nextTheme);
              setDesignTokens(nextDesignTokens);
              toast.error(t("Failed to undo theme update"));
            });
          },
        },
        closeButton: true,
        duration: 15000,
      });
    },
    [designTokens, saveThemeAndDesignTokens, setDesignTokens, setThemeValues, t, themeValues],
  );

  // ── Preset handlers ───────────────────────────────────────────
  const applyPreset = async () => {
    const preset = themePresets.find((item) => selectedPreset in item);
    if (!preset) {
      console.error("Preset not found:", selectedPreset);
      return;
    }

    const presetConfig = resolveThemePreset(preset, selectedPreset);
    const newThemeValues = presetConfig?.theme;
    if (!presetConfig || !isCompleteTheme(newThemeValues)) {
      console.error("Invalid preset structure:", newThemeValues);
      return;
    }

    if (presetConfig.designTokens === undefined) {
      setThemeWithHistory(newThemeValues);
      setSelectedPreset("");
      return;
    }

    try {
      await applyThemeAndDesignTokens({
        theme: newThemeValues,
        designTokenOverrides: presetConfig.designTokens,
      });
    } catch {
      toast.error(t("Failed to update theme"));
    }
  };

  const handleAiThemeGenerated = applyThemeAndDesignTokens;

  const handleFontChange = useDebouncedCallback(
    (key: string, newValue: string) => {
      setThemeValues(() => ({
        ...themeValues,
        fontFamily: {
          ...themeValues.fontFamily,
          [key.replace(/font-/g, "")]: newValue,
        },
      }));
      debouncedSaveTheme();
    },
    [themeValues, debouncedSaveTheme],
    200,
  );

  const handleBorderRadiusChange = React.useCallback(
    (value: string) => {
      let numValue = value === "" ? "0" : value;
      const parsed = parseInt(numValue);
      if (isNaN(parsed) || parsed < 0 || parsed > 50) {
        numValue = "0";
      } else {
        numValue = parsed.toString();
      }
      setThemeValues((prev) => ({
        ...prev,
        borderRadius: `${numValue}px`,
      }));
      debouncedSaveTheme();
    },
    [setThemeValues, debouncedSaveTheme],
  );

  const handleBorderRadiusSliderChange = React.useCallback(
    (value: string) => {
      setThemeValues((prev) => ({
        ...prev,
        borderRadius: `${value}px`,
      }));
      debouncedSaveTheme();
    },
    [setThemeValues, debouncedSaveTheme],
  );

  const handleColorChange = useDebouncedCallback(
    (key: string, newValue: string) => {
      setThemeValues(() => {
        const prevColor = get(themeValues, `colors.${key}`)! as [string, string];
        if (!isDarkMode) {
          set(prevColor, 0, newValue);
        } else {
          set(prevColor, 1, newValue);
        }
        return {
          ...themeValues,
          colors: {
            ...themeValues.colors,
            [key]: prevColor,
          },
        };
      });
      debouncedSaveTheme();
    },
    [themeValues, debouncedSaveTheme],
    200,
  );

  const renderColorGroup = (group: any) => (
    <div className="grid grid-cols-1">
      {Object.entries(group.items).map(([key]) => {
        const themeColor = get(themeValues, `colors.${key}.${isDarkMode ? 1 : 0}`);
        if (!themeColor) return null;
        return (
          <div key={key} id={`theme-${key}`} className="flex items-center gap-x-2 py-0.5">
            <ColorPickerInput
              value={themeColor as string}
              onChange={(newValue: string) => handleColorChange(key, newValue)}
            />
            <Label className="text-xs font-light leading-tight text-foreground">
              {key
                .split(/(?=[A-Z])/)
                .join(" ")
                .replace(/-/g, " ")
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ") +
                (!key.toLowerCase().includes("foreground") &&
                !key.toLowerCase().includes("border") &&
                !key.toLowerCase().includes("input") &&
                !key.toLowerCase().includes("ring") &&
                !key.toLowerCase().includes("background")
                  ? " Background"
                  : "")}
            </Label>
          </div>
        );
      })}
    </div>
  );

  if (!hasPermission(CHAI_PERMISSIONS["theme:edit"])) {
    return (
      <div className="relative w-full">
        <div
          className={cn(
            "no-scrollbar flex h-full w-full items-center justify-center overflow-y-auto text-center",
            className,
          )}>
          <div className="space-y-2 px-4 text-muted-foreground">
            <p className="text-xs font-light leading-relaxed">
              {t("You don't have permission to edit the theme. Please contact your administrator to get access.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className={cn("no-scrollbar h-full w-full overflow-y-auto", className)}>
        {themePresets.length > 0 && (
          <div className="space-y-2 py-2">
            <div className="flex w-full items-center justify-between">
              <Label className="text-xs font-medium text-foreground">{t("Presets")}</Label>
              <div className="flex items-center gap-1">
                {importThemeEnabled && (
                  <Button variant="link" size="xs" onClick={() => setIsImportModalOpen(true)}>
                    {t("Import theme")}
                  </Button>
                )}

                {isAiEnabled && (
                  <ChaiSlot
                    slotId={CHAI_SLOT_IDS.THEME_PANEL_ACTIONS}
                    context={{ onThemeGenerated: handleAiThemeGenerated }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder={t("Select preset")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(themePresets) &&
                    themePresets.map((preset: any) => {
                      const key = Object.keys(preset)[0];
                      const label = key.replaceAll("_", " ");
                      return (
                        <SelectItem key={key} value={key} className="text-xs">
                          {capitalize(label)}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!selectedPreset} onClick={applyPreset}>
                {t("Apply")}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        <div className={cn("space-y-3 py-2", className)}>
          {availableFonts.length > 0 ? (
            <>
              {/* Fonts Section */}
              <div className="flex items-center gap-2 pt-1">
                <TextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{t("Typography")}</span>
              </div>
              {chaiThemeOptions?.fontFamily && (
                <div className="space-y-2">
                  {Object.entries(chaiThemeOptions.fontFamily).map(([key, value]: [string, any]) => (
                    <FontSelector
                      key={key}
                      label={key}
                      value={
                        themeValues.fontFamily[key.replace(/font-/g, "") as keyof typeof themeValues.fontFamily] ||
                        value[Object.keys(value)[0]]
                      }
                      onChange={(newValue: string) => handleFontChange(key, newValue)}
                    />
                  ))}
                </div>
              )}
              <Separator />
            </>
          ) : (
            ""
          )}

          {/* Border Radius Section */}
          {chaiThemeOptions?.borderRadius && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SquareRoundCorner className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{t("Border Radius")}</span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    className="h-6 w-14 rounded-sm border-input bg-muted/20 pr-5 text-right text-[10px] font-light [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={themeValues.borderRadius.replace("px", "")}
                    onChange={(e) => handleBorderRadiusChange(e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-1 text-[10px] font-light text-foreground">
                    px
                  </span>
                </div>
              </div>
              <div className="py-1">
                <BorderRadiusInput value={themeValues.borderRadius} onChange={handleBorderRadiusSliderChange} />
              </div>
            </div>
          )}

          <Separator />

          {/* Colors Section with Mode Switch */}
          {chaiThemeOptions?.colors && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MixerHorizontalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{t("Colors")}</span>
                </div>
                {darkModeEnabled && (
                  <div className="flex items-center gap-1.5">
                    <SunIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={(checked: boolean) => setIsDarkMode(checked)}
                      aria-label={t("Toggle dark mode")}
                    />
                    <MoonIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                {chaiThemeOptions.colors.map((group) => (
                  <div key={group.group}>{renderColorGroup(group)}</div>
                ))}
              </div>
            </div>
          )}
          <Suspense fallback={<div />}>
            {isImportModalOpen && importThemeEnabled && (
              <LazyCssImportModal
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                onImport={handleCssImport}
              />
            )}
          </Suspense>
        </div>
        <br />
        <br />
        <br />
        <br />
      </div>
    </div>
  );
});

ThemeConfigPanel.displayName = "ThemeConfigPanel";

export default ThemeConfigPanel;
