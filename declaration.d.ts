declare module "himalaya" {
  export interface HimalayaAttribute {
    key: string;
    value: string;
  }

  export interface HimalayaNode {
    type: "element" | "text" | "comment";
    tagName?: string;
    attributes?: HimalayaAttribute[];
    children?: HimalayaNode[];
    content?: string;
  }

  export function parse(html: string): HimalayaNode[];
  export function stringify(nodes: HimalayaNode[]): string;
}

declare global {
  interface Window {
    tailwind: {
      config: object;
    };
  }
}

/** Injected by tsup `define` at build time; `undefined` when running source (vitest/tsx). */
declare const __CHAI_CORE_VERSION__: string | undefined;

/** `true` only in the published bundle (tsup define); `undefined` when running source. */
declare const __CHAI_CORE_BUNDLED__: boolean | undefined;
