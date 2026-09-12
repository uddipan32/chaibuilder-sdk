import { shouldDebug } from "./debug-level";
import { logAiPhaseStart } from "./debug-log";
import { withTraceDepth } from "./debug-trace";

const DATA_URI_PATTERN = /data:[^;]+;base64,[A-Za-z0-9+/=]+/g;

/** Strip base64/data URIs and long strings before verbose logging. */
export function sanitizeAiLogText(text: string, max = 120): string {
  const sanitized = text.replace(DATA_URI_PATTERN, "[data-uri]");
  if (sanitized.length <= max) return sanitized;
  return `${sanitized.slice(0, max)}…`;
}

export function summarizeAiMessages(messages: unknown[]): string {
  return `messages=${messages.length}`;
}

export async function withAiDebugPhase<T>(
  action: string,
  detail: string | undefined,
  fn: () => T | Promise<T>,
): Promise<T> {
  if (!shouldDebug(1)) return fn();
  return withTraceDepth(async () => {
    logAiPhaseStart(action, detail);
    return fn();
  });
}
