import { eq } from "drizzle-orm";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getConfigSiteSettingsTransform } from "~/server/defaults/config-registry";
import type { ChaiWebsiteSetting } from "~/types";
import { getInitializedState } from "../state";
import { withChaiCache } from "./cache-utils";

// Stable function reference for caching - defined once at module level
async function fetchSiteSettings(appId: string, draftMode: boolean): Promise<ChaiWebsiteSetting> {
  const table = draftMode ? db.query.apps : db.query.appsOnline;
  const { data: settings, error } = await safeQuery(() =>
    table.findFirst({
      where: eq(schema.apps.id, appId),
    }),
  );

  if (error || !settings) {
    console.error("Error fetching site settings", error);
    throw new Error("SITE_SETTINGS_NOT_FOUND");
  }

  // The app's `transformSiteSettings` gets the last say over the row — deriving fields from
  // its own columns (e.g. merging a brand snapshot into `theme`) without the core knowing
  // they exist. It runs inside this cache entry, so it must be a pure function of the row.
  const transform = getConfigSiteSettingsTransform();
  const transformed = transform ? await transform(settings, { appId, draftMode }) : settings;

  return { ...transformed, appKey: "" } as ChaiWebsiteSetting;
}

export const getSiteSettings = async (): Promise<ChaiWebsiteSetting> => {
  const state = getInitializedState();
  return await withChaiCache(
    fetchSiteSettings,
    [`website-settings-${state.appId}`],
    [`website-settings`, `website-settings-${state.appId}`],
    false,
    "fetchSiteSettings",
  )(state.appId!, state.draftMode);
};
