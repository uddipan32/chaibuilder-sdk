import { hasBindings } from "~/render/binding-engine";
import { ChaiBlock } from "~/types/common";

export interface FilterOutlineBlocksOptions {
  term: string;
  types: string[];
  conditionalOnly: boolean;
  bindingsOnly: boolean;
  animationsOnly: boolean;
  fullBlocks?: Map<string, ChaiBlock>;
  getContentProps?: (type: string) => string[];
}

const HTML_TAG_RE = /<[^>]*>/g;

function matchesContent(
  full: ChaiBlock,
  lowercasedTerm: string,
  getContentProps?: (type: string) => string[],
): boolean {
  if (!getContentProps) return false;
  const props = getContentProps(full._type as string);
  if (!props?.length) return false;

  for (const [key, value] of Object.entries(full)) {
    if (typeof value !== "string") continue;
    const isContentKey = props.some((prop) => key === prop || key.startsWith(prop + "-"));
    if (!isContentKey) continue;
    const stripped = value.replace(HTML_TAG_RE, " ").toLowerCase();
    if (stripped.includes(lowercasedTerm)) return true;
  }
  return false;
}

function hasConditionalShow(full: ChaiBlock): boolean {
  return "_show" in full && full._show !== true;
}

function hasDataBindings(full: ChaiBlock): boolean {
  for (const [key, value] of Object.entries(full)) {
    if (key.startsWith("_")) continue;
    if (typeof value === "string") {
      if (hasBindings(value)) return true;
    } else if (value !== null && typeof value === "object") {
      if (hasBindings(JSON.stringify(value))) return true;
    }
  }
  return false;
}

function hasAnimation(full: ChaiBlock): boolean {
  for (const [key, value] of Object.entries(full)) {
    if (!key.endsWith("_attrs")) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>)["data-animation"]) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively walks treeData and returns blocks that match all active filters.
 * Returns null when no filters are active.
 */
export function filterOutlineBlocks(
  treeData: any[],
  {
    term,
    types,
    conditionalOnly,
    bindingsOnly,
    animationsOnly,
    fullBlocks,
    getContentProps,
  }: FilterOutlineBlocksOptions,
): ChaiBlock[] | null {
  if (!term.trim() && types.length === 0 && !conditionalOnly && !bindingsOnly && !animationsOnly) {
    return null;
  }

  const lowercasedTerm = term.toLowerCase();
  const results: ChaiBlock[] = [];

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      const full = (fullBlocks?.get(node._id) ?? node) as ChaiBlock;

      let matchesTerm = true;
      let matchesType = true;
      let matchesConditional = true;
      let matchesBindings = true;
      let matchesAnimations = true;

      if (term.trim()) {
        matchesTerm =
          node._name?.toLowerCase().includes(lowercasedTerm) ||
          node._type?.toLowerCase().includes(lowercasedTerm) ||
          matchesContent(full, lowercasedTerm, getContentProps);
      }

      if (types.length > 0) {
        matchesType = types.includes(node._type);
      }

      if (conditionalOnly) {
        matchesConditional = hasConditionalShow(full);
      }

      if (bindingsOnly) {
        matchesBindings = hasDataBindings(full);
      }

      if (animationsOnly) {
        matchesAnimations = hasAnimation(full);
      }

      if (matchesTerm && matchesType && matchesConditional && matchesBindings && matchesAnimations) {
        results.push(node);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  };

  walk(treeData);
  return results;
}
