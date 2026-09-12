import { eq } from "drizzle-orm";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getInitializedState } from "../state";
import { withRequestCache } from "./cache-utils";

export type SiteDomains = {
  subdomain: string;
  domain: string | null;
  domainConfigured: boolean;
};

// Stable function reference for caching - defined once at module level
async function fetchSiteDomains(appId: string): Promise<SiteDomains> {
  const { data, error } = await safeQuery(() =>
    db.query.appDomains.findFirst({
      where: eq(schema.appDomains.app, appId),
      columns: {
        subdomain: true,
        domain: true,
        domainConfigured: true,
      },
    }),
  );

  if (error || !data?.subdomain) {
    console.error("Error fetching site domains", error);
    throw new Error("SITE_DOMAINS_NOT_FOUND");
  }

  return {
    subdomain: data.subdomain,
    domain: data.domain,
    domainConfigured: data.domainConfigured ?? false,
  };
}

export const getSiteDomains = async (): Promise<SiteDomains> => {
  const state = getInitializedState();
  if (!state.appId) {
    throw new Error("APP_ID_NOT_FOUND");
  }
  //TODO: Change to persistent cache once invalidation is implemented
  return await withRequestCache(fetchSiteDomains)(state.appId!);
};
