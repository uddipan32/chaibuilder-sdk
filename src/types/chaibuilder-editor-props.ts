import React from "react";
import { StructureRule } from "~/builder/hooks/structure-rules";
import { ChaiPage } from "~/builder/pages/utils/page-organization";
import { ChaiBlock } from "~/types/common";
import { ChaiLoggedInUser, ChaiPageType } from "./actions";
import { ChaiCollectoin } from "./collections";
import { ChaiRepeaterDataDefinition } from "./repeater-data";
import { ChaiDesignTokens, ChaiSiteWideUsageData } from "./types";

export type ChaiLibraryBlock<T = Record<string, any>> = {
  id: string;
  group: string;
  name: string;
  preview?: string;
  tags?: string[];
  description?: string;
} & T;

export type ChaiLibrary<T = Record<string, any>> = {
  id: string;
  name: string;
  blocks?: ChaiLibraryBlock[];
  description?: string;
} & T;

type ReactComponentType = React.ComponentType<any>;

type CSSVariableName = string;
type HSLColor = string;
type HexColor = string;
export type ChaiCssVariableNameWithDefault = Record<CSSVariableName, any>;
type VariableKey = string;
export type ChaiBorderRadiusValue = false | string;

export type ChaiThemeOptions = {
  fontFamily: false | Record<VariableKey, string>;
  borderRadius: ChaiBorderRadiusValue;
  colors: {
    group: string;
    items: Record<VariableKey, [HSLColor, HSLColor]>;
  }[];
};

export type ChaiBreakpoint = {
  title: string;
  content: string;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  icon: React.ReactNode | Element;
  width: number;
};

export type ChaiSavePageData = {
  autoSave: boolean;
  blocks: ChaiBlock[];
  needTranslations?: boolean;
  designTokens: ChaiDesignTokens;
  partialIds?: string[];
  linkPageIds?: string[];
};

export type ChaiSaveWebsiteData =
  | { type: "THEME"; data: ChaiTheme }
  | { type: "DESIGN_TOKENS"; data: ChaiDesignTokens }
  | {
      type: "THEME_AND_DESIGN_TOKENS";
      data: { theme: ChaiTheme; designTokens: ChaiDesignTokens };
    };

export type ChaiAskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<any, number>;
  error?: any;
};

export type ChaiTheme = {
  fontFamily: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  colors: {
    background: [HexColor, HexColor];
    foreground: [HexColor, HexColor];
    primary: [HexColor, HexColor];
    "primary-foreground": [HexColor, HexColor];
    secondary: [HexColor, HexColor];
    "secondary-foreground": [HexColor, HexColor];
    muted: [HexColor, HexColor];
    "muted-foreground": [HSLColor, HSLColor];
    accent: [HSLColor, HSLColor];
    "accent-foreground": [HSLColor, HSLColor];
    destructive: [HSLColor, HSLColor];
    "destructive-foreground": [HSLColor, HSLColor];
    border: [HSLColor, HSLColor];
    input: [HSLColor, HSLColor];
    ring: [HexColor, HexColor];
    card: [HexColor, HexColor];
    "card-foreground": [HexColor, HexColor];
    popover: [HexColor, HexColor];
    "popover-foreground": [HexColor, HexColor];
    success?: [HexColor, HexColor];
    "success-foreground"?: [HexColor, HexColor];
    warning?: [HexColor, HexColor];
    "warning-foreground"?: [HexColor, HexColor];
    info?: [HexColor, HexColor];
    "info-foreground"?: [HexColor, HexColor];
    purple?: [HexColor, HexColor];
    "purple-foreground"?: [HexColor, HexColor];
    orange?: [HexColor, HexColor];
    "orange-foreground"?: [HexColor, HexColor];
    aqua?: [HexColor, HexColor];
    "aqua-foreground"?: [HexColor, HexColor];
  };
};

export type ChaiThemePresetConfig = {
  /**
   * Partial by design: `resolveThemePreset` wraps the legacy `{ name: theme }` shape,
   * whose value is a `Partial<ChaiTheme>`. Requiring a full `ChaiTheme` here does not
   * compile. Consumers narrow with `isCompleteTheme` before use.
   */
  theme: Partial<ChaiTheme>;
  /** Optional design-token overrides applied with the preset. */
  designTokens?: ChaiDesignTokens;
};

/**
 * Named theme preset. Supports `{ name: theme }` and
 * `{ name: { theme, designTokens } }` shapes.
 */
export type ChaiThemePreset = Record<string, Partial<ChaiTheme> | ChaiThemePresetConfig>;

export interface ChaiBuilderEditorProps {
  children?: React.ReactNode;
  /**
   * Goto page callback
   */
  gotoPage?: ({ pageId, lang, blockId }: { pageId: string; lang: string; blockId?: string }) => void;

  /**
   * User
   */
  user?: ChaiLoggedInUser;

  /**
   * Permissions
   */
  permissions?: string[] | null;

  /**
   * Optional pageId. If not provided, a random pageId will be generated
   */
  pageId?: string;

  /**
   * Page external data
   */
  pageExternalData?: Record<string, any>;

  /**
   * Theme presets
   */
  themePresets?: ChaiThemePreset[];

  /**
   * Theme
   */
  theme?: ChaiTheme;



  /**
   * Builder theme
   */
  builderTheme?: ChaiTheme;

  /**
   * Theme panel component
   * TODO: Move to registerChaiThemePanelComponent()
   */
  themePanelComponent?: ReactComponentType;
  /**
   * onError callback function
   * @param error
   */
  onError?: (error: Error) => void;
  /**
   * Translations object
   */
  translations?: Record<string, Record<string, any>>;

  /**
   * Custom layout component
   * TODO: Move to registerChaiLayoutComponent()
   */
  layout?: React.ComponentType;

  /**
   * HTML direction.
   */
  htmlDir?: "ltr" | "rtl";

  /**
   * Tailwind CSS major version for the canvas iframe Play CDN.
   * `"3"` → cdn.tailwindcss.com/3.x; `"4"` → @tailwindcss/browser@4. Default `"4"`.
   */
  tailwindCSS?: "3" | "4";

  /**
   * Plain CSS injected into the canvas iframe `<head>` (as a regular `<style>`, not compiled by the
   * Tailwind browser build). The canvas never loads the host site's stylesheet, so rules the
   * published page gets from there (e.g. styling for HTML produced by data bindings) can be mirrored
   * here to keep the builder preview faithful.
   */
  canvasStyles?: string;

  /**
   * Show debug logs
   */
  debugLogs?: boolean;

  /**
   * Auto save support
   */
  autoSave?: boolean;

  /**
   * Auto save interval in seconds
   */
  autoSaveActionsCount?: number;

  /**
   * Breakpoints
   */
  breakpoints?: ChaiBreakpoint[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Locale
   */
  locale?: string;

  /**
   * Ask AI callback
   */
  askAiCallBack?: (
    type: "styles" | "content",
    prompt: string,
    blocks: ChaiBlock[],
    lang: string,
  ) => Promise<ChaiAskAiResponse>;

  /**
   * Get partial blocks
   * @returns {Record<string, { type: string; name: string; description?: string; tags?: string[] }>}
   */
  getPartialBlocks?: () => Promise<Record<string, { type: string; name: string; description?: string; tags?: string[] }>>;

  /**
   * Get all blocks of a partial block
   */
  getPartialBlockBlocks?: (partialBlockKey: string) => Promise<ChaiBlock[]>;

  /**
   * Blocks for the page
   */
  blocks?: ChaiBlock[];

  /**
   * onSave callback function
   * @param saveData
   */
  onSave?: ({ blocks, autoSave }: ChaiSavePageData) => Promise<boolean | Error>;

  /**
   * onSaveWebsiteData callback function for theme and design tokens
   * @param saveData
   */
  onSaveWebsiteData?: (data: ChaiSaveWebsiteData) => Promise<boolean | Error>;

  /**
   * onSaveStateChange callback function
   * @param syncStatus
   */
  onSaveStateChange?: (syncStatus: "SAVED" | "SAVING" | "UNSAVED") => void;

  /**
   * Preview component
   * TODO: Move to registerChaiPreviewComponent()
   */
  previewComponent?: ReactComponentType;

  /**
   * Content locale
   */
  fallbackLang?: string;

  /**
   * Languages
   */
  languages?: string[];

  /**
   * Page Types props
   */
  pageTypes?: ChaiPageType[];

  /**
   * Search page type items
   */
  searchPageTypeItems?: (
    pageTypeKey: string,
    query: string,
  ) => Promise<Pick<ChaiPage, "id" | "slug" | "name">[] | Error>;

  /**
   * Collections
   * @deprecated Use `chaiCollections` instead.
   */
  collections?: ChaiCollectoin[];

  /**
   * @deprecated Use `chaiCollections` instead. Still read as a fallback.
   */
  repeaterData?: ChaiRepeaterDataDefinition[];

  /**
   * Collection data definitions (fields, default sort/limit) for the adaptive
   * filter UI. Client-safe — no fetch functions.
   */
  chaiCollections?: ChaiRepeaterDataDefinition[];

  /**
   * Get Block Async Props
   */
  getBlockAsyncProps?: (args: { block: ChaiBlock }) => Promise<{ [key: string]: any }>;

  /**
   * temporary props. Not to be used in production
   */
  flags?: {
    librarySite?: boolean;
    copyPaste?: boolean;
    darkMode?: boolean;
    dataBinding?: boolean;
    importHtml?: boolean;
    importTheme?: boolean;
    gotoSettings?: boolean;
    dragAndDrop?: boolean;
    validateStructure?: boolean;
    designTokens?: boolean;
    resetSeoToDefault?: boolean;
    pagesManager?: boolean;
    animation?: boolean;
    /** When true, builder can create `_layout` pages and add PageSlot blocks on them. Default off. */
    layoutPages?: boolean;
  };

  //TODO: Move to registerChaiStructureRules()
  structureRules?: StructureRule[];

  designTokens?: ChaiDesignTokens;

  siteWideUsage?: ChaiSiteWideUsageData;

  /**
   * Custom feature labels with i18n support
   */
  labels?: {
    features?: {
      designTokens?: string | Record<string, string>;
      trash?: string | Record<string, string>;
      dataBinding?: string | Record<string, string>;
      ai?: string | Record<string, string>;
    };
  };

  /**
   * Screen to small message component
   */
  smallScreenComponent?: ReactComponentType;
}
