export type TailwindConfig = {
  darkMode?: string;
  theme?: Record<string, unknown>;
  plugins?: unknown[];
  corePlugins?: Record<string, unknown>;
};

export type CompileTailwindOptions = {
  markupStrings: string[];
  safelist?: string[];
  includeBaseStyles?: boolean;
  config: TailwindConfig;
};
