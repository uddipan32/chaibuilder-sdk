/**
 * Client-side fetch interceptors for builder action requests.
 *
 * Every request the builder sends through `useFetch` passes the registered interceptors: each
 * may contribute request headers and observe the parsed JSON body of the response. This is the
 * seam for plugins that need to ride along on action traffic (a refresh throttle hint, a status
 * envelope the server attaches to every response) without editing the fetch layer.
 *
 * Registration is keyed by name and idempotent (re-registering replaces), the same shape as the
 * server-side registries in `~/server/plugin-api`. Interceptors run in registration order;
 * one that throws is logged and skipped — a plugin must never break the builder's requests.
 */
export type ChaiFetchInterceptorContext = {
  /** The action name being requested, e.g. `"GET_PAGES"`. */
  action: string;
};

export type ChaiFetchInterceptor = {
  /**
   * Extra request headers. Headers passed by the caller and `Authorization` always win over
   * interceptor headers.
   */
  headers?: (ctx: ChaiFetchInterceptorContext) => Record<string, string> | null | undefined;
  /**
   * Observes the parsed JSON body of every non-streaming action response, success or failure,
   * before the builder interprets it. Must not throw (a throw is logged and ignored).
   */
  onResponse?: (ctx: ChaiFetchInterceptorContext & { status: number; body: unknown }) => void;
};

const REGISTRY = new Map<string, ChaiFetchInterceptor>();

export const registerChaiFetchInterceptor = (name: string, interceptor: ChaiFetchInterceptor): void => {
  REGISTRY.set(name, interceptor);
};

export const getChaiFetchInterceptors = (): ChaiFetchInterceptor[] => Array.from(REGISTRY.values());

/** Request headers contributed by every interceptor, later registrations winning on conflicts. */
export const collectChaiFetchInterceptorHeaders = (ctx: ChaiFetchInterceptorContext): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const interceptor of REGISTRY.values()) {
    try {
      Object.assign(headers, interceptor.headers?.(ctx) ?? {});
    } catch (error) {
      console.error("ChaiBuilder: fetch interceptor headers() failed:", error);
    }
  }
  return headers;
};

/** Hands a parsed response body to every interceptor; a throwing interceptor is logged and skipped. */
export const notifyChaiFetchInterceptors = (
  ctx: ChaiFetchInterceptorContext & { status: number; body: unknown },
): void => {
  for (const interceptor of REGISTRY.values()) {
    try {
      interceptor.onResponse?.(ctx);
    } catch (error) {
      console.error("ChaiBuilder: fetch interceptor onResponse() failed:", error);
    }
  }
};

/** @internal Clears the registry between unit tests. */
export const resetChaiFetchInterceptorsForTests = (): void => {
  REGISTRY.clear();
};
