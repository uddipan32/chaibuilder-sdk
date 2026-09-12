import { consola } from "consola";
import type { ChaiDebugLevel } from "~/types/chaibuilder-config";
import { getDebugLevel, shouldDebug } from "./debug-level";
import { getTracePrefix } from "./debug-trace";

const logger = consola.withTag("ChaiDebug");

function logLine(level: "info" | "success" | "warn" | "debug", message: string): void {
  logger[level](message);
}

function summarizeSql(query: string): string {
  const normalized = query.replace(/\s+/g, " ").trim();
  const op = normalized.match(/^(select|insert|update|delete)/i)?.[1]?.toUpperCase() ?? "SQL";
  const table =
    normalized.match(/\sfrom\s+"?(\w+)"?/i)?.[1] ??
    normalized.match(/\sinto\s+"?(\w+)"?/i)?.[1] ??
    normalized.match(/\supdate\s+"?(\w+)"?/i)?.[1] ??
    "";
  const hasWhere = /\swhere\s/i.test(normalized);
  const suffix = hasWhere ? " WHERE …" : "";
  return table ? `${op} ${table}${suffix}` : truncate(normalized, 120);
}

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function logPhaseStart(label: string, detail?: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const detailSuffix = detail ? ` · ${detail}` : "";
  logLine("info", `${prefix} ▶ ${label}${detailSuffix}`);
}

export function logInitPhase(label: string, durationMs: number): void {
  if (!shouldDebug(1)) return;
  logLine("info", `${label} · ${durationMs}ms`);
}

export function logTraceStart(entryLabel: string, detail?: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const detailSuffix = detail ? ` · ${detail}` : "";
  logLine("info", `${prefix} ▶ ${entryLabel}${detailSuffix}`);
}

export function logDb(durationMs: number, query: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const summary = summarizeSql(query);
  logLine("info", `${prefix} db ${durationMs}ms · ${summary}`);
}

export function logDbVerbose(query: string, params: unknown[]): void {
  if (!shouldDebug(2)) return;
  const prefix = getTracePrefix();
  const paramsSuffix = params.length > 0 ? ` · params=${truncate(JSON.stringify(params), 120)}` : "";
  logLine("debug", `${prefix} db sql · ${truncate(query.replace(/\s+/g, " ").trim(), 160)}${paramsSuffix}`);
}

export function logFetch(method: string, url: string, durationMs: number, status: number): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const statusLabel = status > 0 ? String(status) : "failed";
  logLine("info", `${prefix} fetch ${durationMs}ms · ${method} ${truncate(url, 100)} · ${statusLabel}`);
}

export function logCacheHit(layer: "request" | "persistent", label: string, key: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  logLine("success", `${prefix} cache HIT · ${layer} · ${label} · ${key}`);
}

export function logCacheMiss(layer: "request" | "persistent", label: string, key: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  logLine("warn", `${prefix} cache MISS · ${layer} · ${label} · ${key}`);
}

export function logApi(label: string, durationMs: number): void {
  if (!shouldDebug(2)) return;
  const prefix = getTracePrefix();
  logLine("info", `${prefix} api ${durationMs}ms · ${label}`);
}

export function logAction(label: string, durationMs: number): void {
  if (!shouldDebug(2)) return;
  const prefix = getTracePrefix();
  logLine("info", `${prefix} action ${durationMs}ms · ${label}`);
}

export function logApiComplete(label: string, durationMs: number): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  logLine("info", `${prefix} ◀ ${label} · ${durationMs}ms`);
}

export function logAi(model: string, durationMs: number, mode: string, action?: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const actionLabel = action ? `${action} · ` : "";
  logLine("info", `${prefix} ai ${durationMs}ms · ${actionLabel}${model} · ${mode}`);
}

export function logAiPhaseStart(action: string, detail?: string): void {
  if (!shouldDebug(1)) return;
  const prefix = getTracePrefix();
  const detailSuffix = detail ? ` · ${detail}` : "";
  logLine("info", `${prefix} ▶ ai:${action}${detailSuffix}`);
}

export function logAiVerbose(message: string): void {
  if (!shouldDebug(2)) return;
  const prefix = getTracePrefix();
  logLine("debug", `${prefix} ai · ${truncate(message, 200)}`);
}

export function logAiToolCall(toolName: string, argsSummary: string): void {
  if (!shouldDebug(2)) return;
  const prefix = getTracePrefix();
  logLine("debug", `${prefix} ai tool · ${toolName} · ${truncate(argsSummary, 120)}`);
}

export function logAiStreamEvent(event: string, detail?: string, minLevel: ChaiDebugLevel = 2): void {
  if (!shouldDebug(minLevel)) return;
  const prefix = getTracePrefix();
  const detailSuffix = detail ? ` · ${detail}` : "";
  logLine(minLevel === 1 ? "info" : "debug", `${prefix} ai stream · ${event}${detailSuffix}`);
}

/** @internal Exposed for tests */
export function __getDebugLevelForTests(): ChaiDebugLevel {
  return getDebugLevel();
}
