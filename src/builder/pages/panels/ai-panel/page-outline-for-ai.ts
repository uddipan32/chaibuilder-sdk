import { ChaiBlock } from "~/types/common";

const TEXT_PROP_KEYS = ["content", "text", "title", "label", "heading"] as const;
const MAX_TEXT_LENGTH = 60;

const getBlockText = (block: ChaiBlock): string => {
  for (const key of TEXT_PROP_KEYS) {
    const value = (block as Record<string, any>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      // RichText content can carry markup — strip tags for the outline
      const text = value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
    }
  }
  return "";
};

/**
 * Build the compact page outline the AI works from. One line per block:
 * `bid | type | name | short text`, indented by nesting depth. This is the
 * only page representation in the model context — full HTML is fetched on
 * demand via the read_block_html tool.
 */
export const buildPageOutlineForAi = (blocks: ChaiBlock[]): string => {
  if (!blocks || blocks.length === 0) return "";

  const byParent = new Map<string | null, ChaiBlock[]>();
  for (const block of blocks) {
    const key = (block._parent ?? null) as string | null;
    const existing = byParent.get(key);
    if (existing) existing.push(block);
    else byParent.set(key, [block]);
  }

  const lines: string[] = [];

  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const block of children) {
      const segments = [block._id, block._type];
      const name = block._name && block._name !== block._type ? block._name : "";
      const text = getBlockText(block);
      if (name) segments.push(name);
      if (text) segments.push(`"${text}"`);
      if (block._type === "PartialBlock" && (block as Record<string, any>).partialBlockId) {
        segments.push(`partial-id=${(block as Record<string, any>).partialBlockId} (edit on its own page)`);
      }
      lines.push(`${"  ".repeat(depth)}${segments.join(" | ")}`);
      walk(block._id, depth + 1);
    }
  };

  walk(null, 0);
  return lines.join("\n");
};

/**
 * Splits pageExternalData into global (site-wide) and page-specific paths.
 * pageExternalData shape: { global: {...}, ...pageSpecificKeys }
 * - global.* paths are available on every page
 * - all other top-level keys are page-specific
 * Arrays produce a single entry for the array (not items, since items need $index notation).
 * maxDepth prevents runaway nesting from inflating the prompt.
 */
export function extractBindingPaths(obj: Record<string, any>, prefix = "", depth = 0, maxDepth = 3): string[] {
  if (depth >= maxDepth) return prefix ? [prefix] : [];
  const paths: string[] = [];
  for (const key of Object.keys(obj ?? {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (Array.isArray(val)) {
      paths.push(fullKey); // array = single leaf path; children via {{$index.field}}
    } else if (val && typeof val === "object") {
      paths.push(...extractBindingPaths(val, fullKey, depth + 1, maxDepth));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

export type ChaiArrayBindingItemField = { name: string; type: string };

export type ChaiArrayBinding = {
  path: string;
  scope: "global" | "page";
  /** Type of the first item: "object", "string", ... or "unknown" when the array is empty. */
  itemType: string;
  /** Flattened fields of a sample item, referenced inside a Repeater as {{$index.name}}. */
  itemFields: ChaiArrayBindingItemField[];
};

const MAX_ITEM_FIELDS = 25;
const ITEM_FIELD_MAX_DEPTH = 2;

const getValueType = (val: any): string => {
  if (Array.isArray(val)) return "array";
  if (val === null) return "null";
  return typeof val;
};

/** Flatten a sample array item so the AI knows which {{$index.field}} paths exist. */
const extractItemFields = (item: any, prefix = "", depth = 0): ChaiArrayBindingItemField[] => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return [];
  const fields: ChaiArrayBindingItemField[] = [];
  for (const key of Object.keys(item)) {
    const name = prefix ? `${prefix}.${key}` : key;
    const val = item[key];
    if (val && typeof val === "object" && !Array.isArray(val) && depth + 1 < ITEM_FIELD_MAX_DEPTH) {
      fields.push(...extractItemFields(val, name, depth + 1));
    } else {
      fields.push({ name, type: getValueType(val) });
    }
  }
  return fields;
};

/**
 * Collects every array in the data tree along with the shape of its items.
 * Arrays are the paths a Repeater can iterate, so the AI needs their item
 * fields to bind children via {{$index.field}}.
 */
export function extractArrayBindings(
  obj: Record<string, any>,
  scope: "global" | "page",
  prefix = "",
  depth = 0,
  maxDepth = 3,
): ChaiArrayBinding[] {
  if (depth >= maxDepth) return [];
  const arrays: ChaiArrayBinding[] = [];
  for (const key of Object.keys(obj ?? {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (Array.isArray(val)) {
      arrays.push({
        path: fullKey,
        scope,
        itemType: val.length > 0 ? getValueType(val[0]) : "unknown",
        itemFields: extractItemFields(val[0]).slice(0, MAX_ITEM_FIELDS),
      });
    } else if (val && typeof val === "object") {
      arrays.push(...extractArrayBindings(val, scope, fullKey, depth + 1, maxDepth));
    }
  }
  return arrays;
}

export function buildDataBindingPayload(pageExternalData: Record<string, any>): {
  global: string[];
  page: string[];
  arrays: ChaiArrayBinding[];
  pathTypes: Record<string, string>;
} {
  const { global: globalData, ...pageData } = pageExternalData ?? {};
  const globalPaths = extractBindingPaths(globalData ?? {}, "global");
  const pagePaths = extractBindingPaths(pageData, "");
  return {
    global: globalPaths,
    page: pagePaths,
    arrays: [
      ...extractArrayBindings(globalData ?? {}, "global", "global"),
      ...extractArrayBindings(pageData, "page", ""),
    ],
    pathTypes: Object.fromEntries(
      [...globalPaths, ...pagePaths].map((path) => {
        const segments = path.split(".");
        let value: any = pageExternalData;
        for (const segment of segments) value = value?.[segment];
        return [path, getValueType(value)];
      }),
    ),
  };
}
