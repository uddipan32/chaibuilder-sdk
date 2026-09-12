"use server";

import { applyChaiDataBinding } from "~/utils";

/**
 * Checks if the given JSON-LD string is valid
 * @param {string} jsonLD - The JSON-LD string to check
 * @returns {boolean} True if the string is valid, false otherwise
 */
const isValidJsonLD = (jsonLD: string): boolean => {
  try {
    const data = JSON.parse(jsonLD);
    return Object.keys(data).length > 0;
  } catch (_error) {
    return false;
  }
};

// The binding engine escapes resolved values for HTML contexts, but JSON-LD is a
// script blob: a bound `Chrysler &amp; Dodge` must serialize as `Chrysler & Dodge`,
// not the literal entity. Undo exactly the five entities the escaper produces,
// walking the bound object BEFORE JSON.stringify so quotes get JSON-escaped
// correctly. Mirrors the same decode in generate-meta-data.ts.
const ESCAPED_ENTITY = /&(amp|lt|gt|quot|#39);/g;
const ENTITY_CHARS: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

const decodeEntitiesDeep = (value: unknown): unknown => {
  if (typeof value === "string") return value.replace(ESCAPED_ENTITY, (_, name) => ENTITY_CHARS[name]);
  if (Array.isArray(value)) return value.map(decodeEntitiesDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, decodeEntitiesDeep(val)]));
  }
  return value;
};

interface JSONLDProps {
  jsonLD?: string;
  pageData?: Record<string, unknown>;
}

/**
 * Renders a JSON-LD script tag with the given JSON-LD string
 * @param {JSONLDProps} props - The JSON-LD string and optional page data
 * @returns The rendered script tag or null if the JSON-LD string is invalid
 */
export const JSONLD = async ({ jsonLD, pageData = {} }: JSONLDProps) => {
  if (!jsonLD || !isValidJsonLD(jsonLD)) return null;
  let jsonLdObj: Record<string, any> = {};
  try {
    jsonLdObj = JSON.parse(jsonLD);
  } catch (_error) {
    return null;
  }
  // applyChaiDataBinding returns a bound OBJECT (not a string). The previous code
  // ran it through isValidJsonLD (which JSON.parses its argument), so JSON.parse
  // of an object threw and the component returned null for EVERY page — silently
  // dropping all per-page seo.jsonLD (e.g. the VDP Car/Vehicle schema). Serialize
  // the bound object ourselves and validate the resulting string instead.
  const bound = decodeEntitiesDeep(applyChaiDataBinding(jsonLdObj, pageData));
  // Escape `<`/`>` so a bound value containing `</script>` can't break out of the
  // JSON-LD <script> at HTML parse time. `decodeEntitiesDeep` above restores the
  // binding engine's escaped `&lt;` to a literal `<`, which would otherwise re-open
  // that injection hole (same guard as blocks/InventoryList ClientVehicleResults).
  // `\uXXXX` stays valid JSON, so isValidJsonLD still parses it.
  const jsonLDString = JSON.stringify(bound).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  if (!isValidJsonLD(jsonLDString)) return null;

  return (
    <script type="application/ld+json" key="jsonld">
      {jsonLDString}
    </script>
  );
};
