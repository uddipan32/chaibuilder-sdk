import { KeyboardIcon } from "@radix-ui/react-icons";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

// Chromium reports userAgentData.platform as "macOS"/"iOS", while navigator.platform
// reports "MacIntel"/"iPhone" — match case-insensitively so both spellings are detected.
const MAC_PLATFORM = /mac|iphone|ipod|ipad|ios/i;

export const isMacPlatform = (platform: string | undefined) => MAC_PLATFORM.test(platform ?? "");

const isMac =
  typeof navigator !== "undefined" &&
  isMacPlatform(
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform,
  );
const mod = isMac ? "⌘" : "Ctrl";

export const helpPanelId = "help";

const HelpButton = ({ isActive, show }: { isActive: boolean; show: () => void; panelId: string }) => {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={show}
      aria-label={t("Keyboard shortcuts")}
      title={t("Keyboard shortcuts")}
      className={`h-8 w-8 ${isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}`}>
      <KeyboardIcon className="size-4" />
    </Button>
  );
};

type Shortcut = { keys: string[]; label: string };

const Keycap = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-sans text-[11px] font-medium leading-none text-foreground shadow-sm">
    {children}
  </kbd>
);

const ShortcutRow = ({ keys, label }: Shortcut) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((key, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-[11px] text-muted-foreground/60">+</span>}
          <Keycap>{key}</Keycap>
        </Fragment>
      ))}
    </span>
  </div>
);

const HelpPanel = () => {
  const { t } = useTranslation();

  const columns: Shortcut[][] = [
    [
      { keys: [mod, "Z"], label: t("Undo") },
      { keys: [mod, "Shift", "Z"], label: t("Redo") },
      { keys: [mod, "D"], label: t("Duplicate") },
      { keys: [mod, "C"], label: t("Copy") },
      { keys: [mod, "X"], label: t("Cut") },
      { keys: [mod, "V"], label: t("Paste") },
    ],
    [
      { keys: [mod, "S"], label: t("Save page") },
      { keys: ["Esc"], label: t("Blur field / deselect blocks") },
      { keys: ["Del"], label: t("Delete block") },
      { keys: ["V / H"], label: t("Select / Hand tool") },
    ],
  ];

  return (
    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {columns.map((column, colIndex) => (
        <div
          key={colIndex}
          className="flex flex-col divide-y divide-border/60 sm:[&:not(:last-child)]:border-r sm:[&:not(:last-child)]:border-border sm:[&:not(:last-child)]:pr-8">
          {column.map((shortcut) => (
            <ShortcutRow key={shortcut.label} {...shortcut} />
          ))}
        </div>
      ))}
    </div>
  );
};

export const helpPanel = {
  button: HelpButton,
  label: "Keyboard shortcuts",
  position: "bottom" as const,
  view: "modal" as const,
  width: 560,
  icon: <KeyboardIcon className="size-4" />,
  panel: HelpPanel,
};
