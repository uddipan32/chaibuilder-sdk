import { logFetch } from "./debug-log";
import { shouldDebug } from "./debug-level";

export async function debugFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!shouldDebug(1)) {
    return fetch(input, init);
  }

  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
  const start = performance.now();

  try {
    const response = await fetch(input, init);
    logFetch(method, url, Math.round(performance.now() - start), response.status);
    return response;
  } catch (error) {
    logFetch(method, url, Math.round(performance.now() - start), 0);
    throw error;
  }
}
