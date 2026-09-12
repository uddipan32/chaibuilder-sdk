import { useTranslation } from "react-i18next";
import { getVisibleSlug } from "~/builder/pages/extensions/getVisibleSlug";
import { resolveBinding } from "~/render/binding-engine";

/**
 * Resolve data-binding placeholders (e.g. `{{page.title}}`) against the page's
 * external data so the preview reads like real search-result text; anything that
 * fails to resolve is stripped rather than shown as a raw template token.
 */
const cleanValue = (value?: string, externalData?: Record<string, any>, locale?: string) => {
  let resolved = value ?? "";
  if (resolved && externalData) {
    try {
      resolved = String(resolveBinding(resolved, externalData, locale) ?? "");
    } catch {
      // fall through to stripping raw tokens
    }
  }
  return resolved
    .replace(/\{\{\s*[^}]*\s*\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

type SeoSearchPreviewProps = {
  title?: string;
  description?: string;
  slug?: string;
  /** Page external data used to resolve `{{...}}` bindings in title/description. */
  externalData?: Record<string, any>;
  /** Page locale the panel is editing; drives locale-sensitive pipes (`date`, `currency`, `number`). */
  locale?: string;
};

/**
 * Google-style search result preview so editors can see how the page's SEO
 * title, description and URL will appear on a search engine results page.
 */
export const SeoSearchPreview = ({ title, description, slug, externalData, locale }: SeoSearchPreviewProps) => {
  const { t } = useTranslation();

  const displayUrl = getVisibleSlug(slug);
  const displayTitle = cleanValue(title, externalData, locale) || t("Your page title");
  const displayDescription =
    cleanValue(description, externalData, locale) ||
    t("Your page description will appear here. Add an SEO description to control what searchers see.");

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("Search Result Preview")}
      </p>
      <div className="rounded-md border bg-surface p-2.5">
        <div className="max-w-full truncate text-xs text-muted-foreground" title={displayUrl}>
          {displayUrl}
        </div>
        <div className="mt-0.5 truncate text-sm font-medium text-[#1a0dab] dark:text-[#8ab4f8]" title={displayTitle}>
          {displayTitle}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{displayDescription}</p>
      </div>
    </div>
  );
};

SeoSearchPreview.displayName = "SeoSearchPreview";
