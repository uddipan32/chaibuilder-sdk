import { getOptionalRequestState } from "~/server/chai-builder/state";

/**
 * First value of an incoming request header for the current request, or `null` when the header
 * is absent or the code runs outside an HTTP request (scripts, MCP tools, unit tests).
 *
 * The headers accessor is captured during context resolution when the host passes the request
 * to `getChaiBuilder(config, routeProps, request)`; see `ChaiRequestContext.requestHeaders`.
 * Comma-joined values are reduced to their first entry, the same rule core applies to `Host`.
 * Plugins use this for client hints (throttles, feature probes) — never for authentication,
 * which belongs to the host's context resolver.
 */
export function getChaiRequestHeader(name: string): string | null {
  const raw = getOptionalRequestState()?.requestHeaders?.get(name);
  const first = raw?.split(",")[0]?.trim();
  return first || null;
}
