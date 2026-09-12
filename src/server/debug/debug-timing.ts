import { logAction, logApi, logApiComplete, logPhaseStart } from "./debug-log";
import { shouldDebug } from "./debug-level";
import { withTraceDepth } from "./debug-trace";

export async function withRenderPhase<T>(
  label: string,
  fn: () => T | Promise<T>,
  detail?: string,
): Promise<T> {
  if (!shouldDebug(1)) {
    return fn();
  }

  return withTraceDepth(async () => {
    logPhaseStart(label, detail);
    const start = performance.now();
    try {
      return await fn();
    } finally {
      logApiComplete(label, Math.round(performance.now() - start));
    }
  });
}

export async function withDebugTiming<T>(
  label: string,
  fn: () => T | Promise<T>,
  kind: "api" | "action" = "api",
): Promise<T> {
  if (!shouldDebug(2)) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    if (kind === "action") {
      logAction(label, durationMs);
    } else {
      logApi(label, durationMs);
    }
  }
}
