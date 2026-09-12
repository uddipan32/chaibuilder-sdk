import type { ChaiPage } from "~/types";
import { getInitializedState } from "../state";
import { getFullPage } from "./get-full-page";
import { getSiteSettings } from "./get-site-settings";
import { registerCacheTags } from "./register-cache-tags";

type PartialPageResult = {
  breadcrumbPages: Array<Pick<ChaiPage, "id" | "name" | "slug" | "lang">>;
  langPages: Array<Pick<ChaiPage, "id" | "name" | "slug" | "lang">>;
} & Pick<
  ChaiPage,
  | "id"
  | "name"
  | "slug"
  | "lang"
  | "primaryPage"
  | "seo"
  | "currentEditor"
  | "pageType"
  | "lastSaved"
  | "dynamic"
  | "parent"
  | "blocks"
>;

export const getPartialPageBySlug = async (slug: string): Promise<PartialPageResult> => {
  getInitializedState();
  const uuid = slug.split("/").pop();
  if (!uuid) {
    throw new Error("PAGE_NOT_FOUND");
  }

  const siteSettings = await getSiteSettings();
  const { partialIds, ...data } = await getFullPage(uuid);
  // Tag this route with every partial merged into it, so publishing a partial
  // (which emits `page-<partialId>`) invalidates its consumer pages. Must run
  // outside getFullPage's persistent cache — nested tags don't propagate.
  await registerCacheTags((partialIds ?? []).map((id) => `page-${id}`));
  const lang = slug.split("/").length > 3 ? slug.split("/")[2] : siteSettings?.fallbackLang;
  return {
    ...data,
    lang,
    breadcrumbPages: [],
    langPages: [],
  };
};
