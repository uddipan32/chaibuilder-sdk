import { eq, or } from "drizzle-orm";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getCleanHostname } from "~/utils";
import { withPersistentCache, withRequestCache } from "./cache-utils";

async function fetchAppIdByCleanHostname(cleanHostname: string): Promise<string> {
  const { data, error } = await safeQuery(() =>
    db.query.appDomains.findFirst({
      where: or(eq(schema.appDomains.domain, cleanHostname), eq(schema.appDomains.subdomain, cleanHostname)),
      columns: {app: true},
    }),
  );

  if (!data?.app) {
    throw new Error(`No site found for hostname: ${cleanHostname}`, { cause: error });
  }

  return data.app;
}

export type ResolveAppIdByHostnameOptions = {
  /** When true, uses per-request cache only (skips persistent cache). */
  draft?: boolean;
};

/**
 * Resolves a public site hostname (domain or subdomain) to a Chai app id.
 * Hostnames are normalized via {@link getCleanHostname} before lookup.
 */
export async function resolveAppIdByHostname(
  hostname: string,
  options?: ResolveAppIdByHostnameOptions,
): Promise<string> {
  const cleanHostname = getCleanHostname(hostname);

  if (options?.draft) {
    return withRequestCache(fetchAppIdByCleanHostname, "resolveAppIdByHostname")(cleanHostname);
  }

  return withPersistentCache(
    fetchAppIdByCleanHostname,
    ["hostname", cleanHostname],
    [`hostname-${cleanHostname}`],
    false,
    "resolveAppIdByHostname",
  )(cleanHostname);
}
