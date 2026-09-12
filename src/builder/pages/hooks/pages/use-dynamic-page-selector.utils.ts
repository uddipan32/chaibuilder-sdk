export function resolveEffectiveLang(selectedLang: string, fallbackLang: string): string {
  return selectedLang || fallbackLang;
}

/**
 * Synthetic slug used to preview a dynamic template whose collection currently
 * has no entries, so the visual layout can still be edited in the builder.
 */
export const PLACEHOLDER_DYNAMIC_SLUG = "placeholder-slug";

/**
 * An item the user typed in rather than picked from a list. Page types without
 * `getDynamicPages` can never list anything, so a typed identifier is the only
 * way to open one of their pages.
 */
export type ManualDynamicPage = {
  id: string;
  name: string;
  slug: string;
  identifier: string;
  lang: string;
  manual: true;
  /** A synthetic fallback selection (empty collection), not a real or typed item. */
  placeholder?: true;
};

/** Builds a selection from a raw identifier. Returns null for blank input. */
export function createManualDynamicPage(identifier: string, lang: string): ManualDynamicPage | null {
  const trimmed = (identifier ?? "").trim();
  if (!trimmed) return null;
  return { id: trimmed, name: trimmed, slug: trimmed, identifier: trimmed, lang, manual: true };
}

/**
 * A synthetic selection for a dynamic page type whose collection is empty. Lets
 * the builder render the template (with empty bindings) so the visual elements
 * stay editable. Flagged `placeholder` so the "no content found" gate ignores it.
 */
export function createPlaceholderDynamicPage(lang: string): ManualDynamicPage {
  return {
    id: PLACEHOLDER_DYNAMIC_SLUG,
    name: PLACEHOLDER_DYNAMIC_SLUG,
    slug: PLACEHOLDER_DYNAMIC_SLUG,
    identifier: PLACEHOLDER_DYNAMIC_SLUG,
    lang,
    manual: true,
    placeholder: true,
  };
}

export function readUrlSlug(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("slug");
}

export function updateUrlSlug(slug: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) {
    url.searchParams.set("slug", slug);
  } else {
    url.searchParams.delete("slug");
  }
  window.history.replaceState({}, "", url.toString());
}
