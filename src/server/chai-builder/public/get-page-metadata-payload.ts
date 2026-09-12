import { cache } from "react";
import { ChaiPageProps } from "~/types";
import { setLang } from "../internal/init";
import { getPageForMetadata } from "./get-page";
import { getDataByPageType, getSiteGlobalData } from "./get-page-data";
import { getSiteSettings } from "./get-site-settings";

/**
 * Lightweight helper for metadata generation that skips heavy operations:
 * - No link resolution in blocks
 * - No collection data fetching
 * - Only fetches global data and page type data needed for SEO bindings
 */
export const getPageMetadataPayload = cache(async (slug: string) => {
  const [page, settings] = await Promise.all([getPageForMetadata(slug), getSiteSettings()]);
  setLang(page.lang);

  const basePageProps: ChaiPageProps = {
    slug,
    pageType: page.pageType,
    fallbackLang: page.fallbackLang,
    pageLang: page.lang,
    dynamic: page.dynamic,
    dynamicSlugCustom: page.dynamicSlugCustom,
    pageBaseSlug: page.slug,
    pageId: page.id,
    primaryPageId: page.primaryPage || page.id,
    languagePageId: page.id,
  };

  // Fetch only global and page type data (skip collections and link resolution)
  const [globalData, pageTypeData] = await Promise.all([
    getSiteGlobalData(page.lang),
    getDataByPageType({ pageType: page.pageType, pageProps: basePageProps, lang: page.lang }),
  ]);

  const pageData = {
    ...pageTypeData,
    global: globalData,
    pageProps: basePageProps,
  };

  return { page, settings, pageData, slug };
});
