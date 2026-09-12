/**
 * Shared "Image quality" settings-panel field for blocks that expose Vercel/
 * next-image optimization control.
 *
 * This is a pure JSON-schema fragment with no Next.js coupling, so it is safe on
 * the portable SDK side. The string `const` values mirror `resolveImageQuality`
 * in `components/ui/image-quality.ts`, which turns them into next/image props.
 *
 * Twin of staging's `sdk/web-blocks/image-quality-prop.ts` (the app-side
 * image-optimization control ports its consumers to `~/web-blocks/*`).
 */

type ImageQualityProp = {
  type: "string";
  title: string;
  default: string;
  oneOf: { const: string; title: string }[];
};

const buildImageQualityProp = (defaultValue: string): ImageQualityProp => ({
  type: "string",
  title: "Image quality",
  default: defaultValue,
  oneOf: [
    // The stored value stays 'auto' (the resolver's fall-through → no explicit
    // quality → next/image's default 75); only the label spells out that 75.
    { const: "auto", title: "Default (75)" },
    { const: "max", title: "Maximum (100)" },
    { const: "high", title: "High (85)" },
    { const: "balanced", title: "Balanced (65)" },
    { const: "low", title: "Low (50)" },
    { const: "raw", title: "Off — serve original" },
  ],
});

/**
 * For the Image block: images already flow through next/image, so Auto
 * (optimized at next/image's default 75) matches today's behavior.
 */
export const imageQualityProp = buildImageQualityProp("auto");

/**
 * For background images (Box/EmptyBox): these render as a raw CSS
 * `background-image` today, so the default is Off — optimization is strictly
 * opt-in and existing pages are unchanged.
 */
export const backgroundImageQualityProp = buildImageQualityProp("raw");
