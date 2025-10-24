import { ChaiBlock } from "@/types/chai-block";
import React from "react";
import { ChaiCollectoin } from "./collections";

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
export type CssVariableNameWithDefault = Record<CSSVariableName, any>;
type VariableKey = string;
export type BorderRadiusValue = false | string;

export type ChaiBuilderThemeOptions = {
  fontFamily: false | Record<VariableKey, string>;
  borderRadius: BorderRadiusValue;
  colors:
    | false
    | {
        group: string;
        items: Record<VariableKey, [HSLColor, HSLColor]>;
      }[];
};

export type Breakpoint = {
  title: string;
  content: string;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  icon: React.ReactNode | Element;
  width: number;
};

export type SavePageData = {
  autoSave: boolean;
  blocks: ChaiBlock[];
  theme?: ChaiThemeValues;
  needTranslations?: boolean;
  domElements?: any;
};

type TimeInSeconds = number;
export type AskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<any, number>;
  error?: any;
};

export type ChaiBuilderInstance = {
  setBlocks: (blocks: ChaiBlock[]) => void;
};

export type PageType = {
  key: string;
  name: string;
};

export type PageTypeItem = {
  id: string;
  name: string;
  slug?: string;
};

export type ChaiThemeValues = {
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
    [key: string]: [HexColor, HexColor];
  };
};

export interface ChaiBuilderEditorProps {
  /**
   * Goto page callback
   */
  gotoPage?: ({ pageId, lang }: { pageId: string; lang: string }) => void;

  /**
   * User
   */
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };

  /**
   * Permissions
   */
  permissions?: string[];

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
  themePresets?: Record<string, Partial<ChaiThemeValues>>[];

  /**
   * Theme options
   */
  themeOptions?: (defaultThemeOptions: ChaiBuilderThemeOptions) => ChaiBuilderThemeOptions;

  /**
   * Theme
   */
  theme?: Partial<ChaiThemeValues>;

  /**
   * Builder theme
   */
  builderTheme?: ChaiThemeValues;

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
  autoSaveInterval?: TimeInSeconds;
  /**
   * Breakpoints
   */
  breakpoints?: Breakpoint[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Locale
   */
  locale?: string;

  /**
   * Dark mode
   */
  darkMode?: boolean;

  /**
   * Import HTML support
   */
  importHTMLSupport?: boolean;

  /**
   * Ask AI callback
   */
  askAiCallBack?: (
    type: "styles" | "content",
    prompt: string,
    blocks: ChaiBlock[],
    lang: string,
  ) => Promise<AskAiResponse>;

  /**
   * Get partial blocks
   * @returns {Record<string, { type: string; name: string; description?: string }>}
   */
  getPartialBlocks?: () => Promise<Record<string, { type: string; name: string; description?: string }>>;

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
  onSave?: ({ blocks, theme, autoSave, domElements }: SavePageData) => Promise<boolean | Error>;

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
  languages?: Array<string>;

  /**
   * Page Types props
   */
  pageTypes?: PageType[];

  /**
   * Search page type items
   */
  searchPageTypeItems?: (pageTypeKey: string, query: string) => Promise<PageTypeItem[] | Error>;

  /**
   * Collections
   */
  collections?: ChaiCollectoin[];

  /**
   * Get Block Async Props
   */
  getBlockAsyncProps?: (args: { block: ChaiBlock }) => Promise<{ [key: string]: any }>;

  /**
   * temporary props. Not to be used in production
   */
  _tempProps?: Record<string, any>;
}
