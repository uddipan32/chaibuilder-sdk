import { nanoid } from "nanoid";
import { getOptionalRequestState } from "~/server/chai-builder/state";

export function ensureTrace(entryLabel: string, detail?: string): boolean {
  const state = getOptionalRequestState();
  if (!state || state.traceId) return false;

  state.traceId = nanoid(6);
  state.traceStart = performance.now();
  state.traceLabel = entryLabel;
  state.traceDetail = detail ?? null;
  return true;
}

export function getTraceDetail(): string | null {
  return getOptionalRequestState()?.traceDetail ?? null;
}

export function getTracePrefix(): string {
  const state = getOptionalRequestState();
  if (!state?.traceId) return "";

  const elapsed = Math.round(performance.now() - state.traceStart);
  const depth = "  ".repeat(state.traceDepth);
  return `${depth}[${state.traceId} +${elapsed}ms]`;
}

export function withTraceDepth<T>(fn: () => T): T {
  const state = getOptionalRequestState();
  if (state) state.traceDepth += 1;
  try {
    return fn();
  } finally {
    if (state) state.traceDepth = Math.max(0, state.traceDepth - 1);
  }
}

export function getTraceLabel(): string | undefined {
  return getOptionalRequestState()?.traceLabel ?? undefined;
}
