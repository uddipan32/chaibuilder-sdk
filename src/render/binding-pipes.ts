import {
  getChaiPipeValueType,
  getRegisteredChaiPipe,
  getRegisteredChaiPipes,
  warnPipeEvaluation,
} from "~/registry/pipes";
import type { ChaiPipeDefinition, ChaiPipeLiteral } from "~/types/pipes";

export const MAX_BINDING_EXPRESSION_LENGTH = 500;
export const MAX_BINDING_PIPES = 10;
export const MAX_PIPE_ARGUMENTS = 10;
// Cap operands in a boolean visibility expression (`a && b && …`) so a pathological
// `_show` cannot fan out into unbounded sub-evaluations.
export const MAX_VISIBILITY_CONDITIONS = 10;

const PIPE_NAME_REGEX = /^[a-z][A-Za-z0-9]*$/;
// A path segment is an object key. Real team keys are French department labels like
// `global.departments.Service et pièces` — Unicode letters (accents) and internal single
// spaces. Allow \p{L}\p{N}_$ words separated by single spaces; this matches what the app's
// runtime resolver (utils/binding-engine.ts) accepts for a dotted segment (anything without an
// operator char). Per-segment leading/trailing whitespace is already stripped upstream by
// normalizePath (segment.trim()), so what this regex actually rejects is double spaces, tabs,
// and other non-word/operator characters inside a segment.
const PATH_SEGMENT_REGEX = /^[\p{L}\p{N}_$]+(?: [\p{L}\p{N}_$]+)*$/u;
const FLAT_PATH_REGEX =
  /^(?:#[A-Za-z0-9_$][A-Za-z0-9_$-]*(?:\/[A-Za-z0-9_$-]+)*|[A-Za-z0-9_$][A-Za-z0-9_$]*(?:\/[A-Za-z0-9_$-]+)+)(?:\.(?:[A-Za-z_$][A-Za-z0-9_$]*|\d+))*$/;
const FORBIDDEN_PATH_SEGMENTS = new Set(["constructor", "prototype", "__proto__"]);

export type ParsedChaiPipe = { name: string; args: ChaiPipeLiteral[] };
export type ChaiBindingUsage = "value" | "visibility";
export type ParsedBindingExpression =
  | { kind: "path"; path: string; pipes: [] }
  | { kind: "pipeline"; path: string; pipes: ParsedChaiPipe[] }
  | { kind: "invalid"; expression: string; reason: string };

const invalid = (expression: string, reason: string): ParsedBindingExpression => ({
  kind: "invalid",
  expression,
  reason,
});

const splitOutsideQuotes = (value: string, delimiter: string): string[] | null => {
  const parts: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "'" || char === '"') {
      if (quote === char) quote = null;
      else if (!quote) quote = char;
      continue;
    }
    if (!quote && char === delimiter) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quote || escaped) return null;
  parts.push(value.slice(start));
  return parts;
};

// Split on a two-character logical operator (`&&` / `||`) that sits outside string
// literals. Used only by the visibility evaluator to combine boolean sub-expressions;
// each resulting operand is re-parsed by the safe path/pipe parser, so no arbitrary
// JavaScript is ever evaluated. Returns null on an unterminated string literal.
const splitByLogicalOperator = (value: string, operator: "&&" | "||"): string[] | null => {
  const parts: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "'" || char === '"') {
      if (quote === char) quote = null;
      else if (!quote) quote = char;
      continue;
    }
    if (!quote && char === operator[0] && value[index + 1] === operator[1]) {
      parts.push(value.slice(start, index));
      index++; // consume the operator's second character
      start = index + 1;
    }
  }
  if (quote || escaped) return null;
  parts.push(value.slice(start));
  return parts;
};

const normalizePath = (path: string): string =>
  path
    .split(".")
    .map((segment) => segment.trim())
    .join(".");

export const validateBindingPath = (
  rawPath: string,
): { valid: true; path: string } | { valid: false; reason: string } => {
  const path = normalizePath(rawPath.trim());
  if (!path) return { valid: false, reason: "Binding path is required" };
  // Surrounding whitespace (inside `{{ }}`, around `|` pipes, or around `.` separators) is already
  // stripped by `parseBindingExpression`/`normalizePath`. Any whitespace that reaches here is internal
  // to a segment; PATH_SEGMENT_REGEX permits legitimate single-space object keys and rejects the rest.
  const segments = path.split(".");
  const validShape = FLAT_PATH_REGEX.test(path) || segments.every((part) => PATH_SEGMENT_REGEX.test(part));
  if (!validShape) {
    // Single spaces between words in a segment are allowed; surface a clearer message when the
    // only problem is disallowed whitespace (double spaces / tabs) rather than the generic error.
    const hasBadWhitespace = segments.some((part) => /\s/.test(part) && !PATH_SEGMENT_REGEX.test(part));
    return {
      valid: false,
      reason: hasBadWhitespace
        ? "Binding path segments may only contain single spaces between words"
        : "Only dotted or collection data paths are allowed",
    };
  }
  if (path.split(/[./]/).some((part) => FORBIDDEN_PATH_SEGMENTS.has(part))) {
    return { valid: false, reason: "Disallowed property access" };
  }
  return { valid: true, path };
};

const parseQuotedString = (token: string): string | null => {
  const quote = token[0];
  if ((quote !== "'" && quote !== '"') || token[token.length - 1] !== quote) return null;
  let result = "";
  for (let index = 1; index < token.length - 1; index++) {
    const char = token[index];
    if (char === "\\") {
      index++;
      if (index >= token.length - 1) return null;
      const escaped = token[index];
      result += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
    } else {
      result += char;
    }
  }
  return result;
};

const tokenizePipe = (segment: string): string[] | null => {
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < segment.length; index++) {
    const char = segment[index];
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      token += char;
      escaped = true;
      continue;
    }
    if (char === "'" || char === '"') {
      token += char;
      if (quote === char) quote = null;
      else if (!quote) quote = char;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += char;
  }
  if (quote || escaped) return null;
  if (token) tokens.push(token);
  return tokens;
};

export const parseChaiPipeLiteral = (token: string): { valid: true; value: ChaiPipeLiteral } | { valid: false } => {
  if (token.startsWith("'") || token.startsWith('"')) {
    const value = parseQuotedString(token);
    return value === null ? { valid: false } : { valid: true, value };
  }
  if (token === "true") return { valid: true, value: true };
  if (token === "false") return { valid: true, value: false };
  if (token === "null") return { valid: true, value: null };
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token)) {
    const value = Number(token);
    return Number.isFinite(value) ? { valid: true, value } : { valid: false };
  }
  return { valid: false };
};

const validatePipeArguments = (definition: Readonly<ChaiPipeDefinition>, args: ChaiPipeLiteral[]): string | null => {
  const schema = definition.args ?? [];
  const required = schema.filter((arg) => arg.required).length;
  if (args.length < required) return `Pipe "${definition.name}" requires ${required} argument(s)`;
  if (args.length > schema.length) return `Pipe "${definition.name}" accepts at most ${schema.length} argument(s)`;
  for (let index = 0; index < args.length; index++) {
    const arg = schema[index];
    const value = args[index];
    if (!arg) return `Unexpected argument for pipe "${definition.name}"`;
    if (arg.type === "number" && typeof value !== "number") return `Argument "${arg.name}" must be a number`;
    if (arg.type === "boolean" && typeof value !== "boolean") return `Argument "${arg.name}" must be a boolean`;
    if ((arg.type === "string" || arg.type === "select") && typeof value !== "string") {
      return `Argument "${arg.name}" must be a string`;
    }
    if (arg.type === "select" && arg.options && !arg.options.some((option) => Object.is(option.value, value))) {
      return `Argument "${arg.name}" has an unsupported value`;
    }
  }
  return null;
};

const parseBindingCore = (expression: string): ParsedBindingExpression => {
  const segments = splitOutsideQuotes(expression, "|");
  if (!segments) return invalid(expression, "Unterminated string literal");
  const pathResult = validateBindingPath(segments[0]);

  if (segments.length === 1) {
    if (pathResult.valid) return { kind: "path", path: pathResult.path, pipes: [] };
    return invalid(expression, pathResult.reason);
  }
  if (!pathResult.valid) return invalid(expression, pathResult.reason);
  if (segments.length - 1 > MAX_BINDING_PIPES) return invalid(expression, "Too many pipes");

  const pipes: ParsedChaiPipe[] = [];
  for (const rawSegment of segments.slice(1)) {
    const tokens = tokenizePipe(rawSegment.trim());
    if (!tokens) return invalid(expression, "Unterminated string literal");
    if (!tokens.length) return invalid(expression, "Pipe name is required");
    const [name, ...rawArgs] = tokens;
    if (!PIPE_NAME_REGEX.test(name)) return invalid(expression, `Invalid pipe name: ${name}`);
    if (rawArgs.length > MAX_PIPE_ARGUMENTS) return invalid(expression, `Pipe "${name}" has too many arguments`);
    const args: ChaiPipeLiteral[] = [];
    for (const rawArg of rawArgs) {
      const parsed = parseChaiPipeLiteral(rawArg);
      if (!parsed.valid) return invalid(expression, `Pipe arguments must be primitive literals: ${rawArg}`);
      args.push(parsed.value);
    }
    // An unregistered pipe stays in the pipeline and is skipped at evaluation time, so a removed
    // or not-yet-registered pipe degrades to the unformatted value instead of blanking the binding.
    // Its arguments cannot be validated without a definition.
    const definition = getRegisteredChaiPipe(name);
    if (definition) {
      const argumentError = validatePipeArguments(definition, args);
      if (argumentError) return invalid(expression, argumentError);
    }
    pipes.push({ name, args });
  }

  return { kind: "pipeline", path: pathResult.path, pipes };
};

// Comparison desugar: a leading-tighter-than-`&&` infix comparison becomes a terminal
// boolean pipe, restoring the pre-v4 (Eta) idiom `{{path == 'x'}}` as a safe pipe.
//   `path === 'x'` / `!==`          → `path | equals|notEquals 'x'`      (Object.is, strict)
//   `path == 'x'`  / `!=`           → `path | looseEquals|looseNotEquals`(JS `==`, loose — matches Eta)
//   `path >= n` `>` `<=` `<`        → `path | gte|gt|lte|lt n`
// Loose vs strict is preserved so `{{year == 2026}}` (provider `"2026"`) and the `{{x == null}}`
// idiom keep the truthiness they had under Eta, while `===` stays exact.
// The right side must be a literal (string/number/boolean/null); `path == otherPath` has
// no pipe form and fails closed. Longest operators first so `==` never shadows `===`.
const COMPARISON_OPERATORS = ["===", "!==", "==", "!=", "<=", ">=", "<", ">"] as const;
const COMPARISON_PIPE: Record<(typeof COMPARISON_OPERATORS)[number], string> = {
  "===": "equals",
  "==": "looseEquals",
  "!==": "notEquals",
  "!=": "looseNotEquals",
  ">=": "gte",
  ">": "gt",
  "<=": "lte",
  "<": "lt",
};

// First top-level comparison operator (outside string literals), or null.
const findComparisonOperator = (
  expression: string,
): { index: number; operator: (typeof COMPARISON_OPERATORS)[number] } | null => {
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "'" || char === '"') {
      if (quote === char) quote = null;
      else if (!quote) quote = char;
      continue;
    }
    if (quote) continue;
    for (const operator of COMPARISON_OPERATORS) {
      if (expression.startsWith(operator, index)) return { index, operator };
    }
  }
  return null;
};

const desugarComparison = (
  expression: string,
  index: number,
  operator: (typeof COMPARISON_OPERATORS)[number],
): ParsedBindingExpression => {
  const lhs = expression.slice(0, index).trim();
  const rhs = expression.slice(index + operator.length).trim();
  if (!lhs) return invalid(expression, "Comparison is missing a left-hand value");
  if (!rhs) return invalid(expression, "Comparison is missing a right-hand value");
  const literal = parseChaiPipeLiteral(rhs);
  if (!literal.valid) return invalid(expression, `Comparison value must be a literal: ${rhs}`);

  const parsedLhs = parseBindingCore(lhs);
  if (parsedLhs.kind === "invalid") return invalid(expression, parsedLhs.reason);
  if (parsedLhs.pipes.length + 1 > MAX_BINDING_PIPES) return invalid(expression, "Too many pipes");

  const pipe: ParsedChaiPipe = { name: COMPARISON_PIPE[operator], args: [literal.value] };
  const definition = getRegisteredChaiPipe(pipe.name);
  if (definition) {
    const argumentError = validatePipeArguments(definition, pipe.args);
    if (argumentError) return invalid(expression, argumentError);
  }
  return { kind: "pipeline", path: parsedLhs.path, pipes: [...parsedLhs.pipes, pipe] };
};

export const parseBindingExpression = (rawExpression: string): ParsedBindingExpression => {
  const expression = rawExpression.trim();
  if (!expression) return invalid(expression, "Binding expression is required");
  if (expression.length > MAX_BINDING_EXPRESSION_LENGTH) return invalid(expression, "Expression is too long");
  if (/\r|\n/.test(expression)) return invalid(expression, "Binding expressions must be on one line");

  // Comparison binds looser than a path but tighter than the `&&`/`||` the visibility
  // evaluator splits on, so a whole atom like `stock_status == 'Réservé'` desugars here.
  const comparison = findComparisonOperator(expression);
  if (comparison) return desugarComparison(expression, comparison.index, comparison.operator);

  // Desugar a leading logical-NOT into a terminal boolean pipe, so the pre-v4 (Eta)
  // truthiness idiom authors wrote in `_show` keeps working without reopening eval:
  //   `!!path` → `path | truthy`   (was `!!value` — coerce to boolean)
  //   `!path`  → `path | not`      (was `!value`  — negated boolean)
  // The prefix negates the whole resolved value, so it appends after any explicit pipes.
  const negation = expression.startsWith("!!") ? "truthy" : expression.startsWith("!") ? "not" : null;
  if (!negation) return parseBindingCore(expression);

  const core = expression.slice(negation === "truthy" ? 2 : 1).trim();
  const parsed = parseBindingCore(core);
  if (parsed.kind === "invalid") return invalid(expression, parsed.reason);
  if (parsed.pipes.length + 1 > MAX_BINDING_PIPES) return invalid(expression, "Too many pipes");
  return { kind: "pipeline", path: parsed.path, pipes: [...parsed.pipes, { name: negation, args: [] }] };
};

/**
 * Evaluate a block-visibility (`_show`) expression to a strict boolean. Beyond the
 * plain path/pipeline an ordinary binding supports, visibility additionally accepts
 * boolean combinations joined by `&&` / `||` (with standard precedence — `||` binds
 * looser; no parentheses, so no grouping ambiguity). Each operand is itself a
 * visibility expression, re-parsed by the safe parser, so this stays fully non-eval.
 * Every leaf operand must resolve to a real boolean (use `!`/`!!` or a boolean pipe
 * such as `| truthy` / `| equals`); a non-boolean leaf fails closed.
 */
export const evaluateVisibilityExpression = (
  expression: string,
  data: Record<string, any>,
  options: { index?: number; repeaterKey?: string; itemKey?: string; locale?: string } = {},
): { ok: true; value: boolean } | { ok: false; reason: string } => {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, reason: "Binding expression is required" };

  // `||` first (lowest precedence), then `&&`. A single operand falls through to the atom.
  for (const operator of ["||", "&&"] as const) {
    const parts = splitByLogicalOperator(trimmed, operator);
    if (!parts) return { ok: false, reason: "Unterminated string literal" };
    if (parts.length === 1) continue;
    if (parts.length > MAX_VISIBILITY_CONDITIONS) return { ok: false, reason: "Too many conditions" };
    const shortCircuitOn = operator === "||"; // OR stops at first true, AND stops at first false
    for (const part of parts) {
      const result = evaluateVisibilityExpression(part, data, options);
      if (!result.ok) return result;
      if (result.value === shortCircuitOn) return { ok: true, value: shortCircuitOn };
    }
    return { ok: true, value: !shortCircuitOn };
  }

  const result = evaluateBindingExpression(trimmed, data, { ...options, usage: "visibility" });
  if (!result.ok) return { ok: false, reason: result.reason };
  if (typeof result.value !== "boolean") {
    return { ok: false, reason: `visibility binding must resolve to a boolean: ${trimmed}` };
  }
  return { ok: true, value: result.value };
};

/** True when `expression` is a boolean combination (top-level `&&` / `||` outside quotes). */
export const isVisibilityCombinatorExpression = (expression: string): boolean => {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  for (const operator of ["||", "&&"] as const) {
    const parts = splitByLogicalOperator(trimmed, operator);
    if (parts && parts.length > 1) return true;
  }
  return false;
};

/**
 * Author-time validation for a visibility (`_show`) expression. Unlike
 * `evaluateVisibilityExpression` (which short-circuits at runtime), this structurally checks
 * EVERY `&&`/`||` operand so an invalid branch in a short-circuited position is still surfaced.
 * A leaf resolving to `undefined` is treated leniently (usually just missing preview data — the
 * runtime fails closed anyway), but a leaf resolving to a concrete non-boolean is an error.
 * Returns a human-readable reason, or `null` when the expression is acceptable.
 */
export const validateVisibilityExpression = (
  expression: string,
  data: Record<string, any>,
  options: { index?: number; repeaterKey?: string; itemKey?: string; locale?: string } = {},
): string | null => {
  const trimmed = expression.trim();
  if (!trimmed) return "Binding expression is required";

  for (const operator of ["||", "&&"] as const) {
    const parts = splitByLogicalOperator(trimmed, operator);
    if (!parts) return "Unterminated string literal";
    if (parts.length === 1) continue;
    if (parts.length > MAX_VISIBILITY_CONDITIONS) return "Too many conditions";
    for (const part of parts) {
      const reason = validateVisibilityExpression(part, data, options);
      if (reason) return reason;
    }
    return null;
  }

  const parsed = parseBindingExpression(trimmed);
  if (parsed.kind === "invalid") return parsed.reason;
  const result = evaluateBindingExpression(trimmed, data, { ...options, usage: "visibility" });
  if (!result.ok) return result.reason;
  // Concrete non-boolean → real authoring error; `undefined` → lenient (missing preview data).
  if (result.value !== undefined && typeof result.value !== "boolean") {
    return "Visibility bindings must resolve to a boolean";
  }
  return null;
};

export const resolveRepeaterBindingPath = (path: string, index: number, repeaterKey: string): string => {
  if (index === -1 || !repeaterKey || !path.startsWith("$index")) return path;
  const repeaterPath =
    repeaterKey.startsWith("{{") && repeaterKey.endsWith("}}") ? repeaterKey.slice(2, -2).trim() : repeaterKey.trim();
  if (path === "$index") return `${repeaterPath}.${index}`;
  if (path.startsWith("$index.")) return `${repeaterPath}.${index}.${path.slice(7)}`;
  return path;
};

export const resolveCollectionItemBindingPath = (path: string, itemKey: string): string => {
  if (!itemKey || !path.startsWith("$item")) return path;
  if (path === "$item") return itemKey;
  if (path.startsWith("$item.")) return `${itemKey}.${path.slice(6)}`;
  return path;
};

export const getValueAtBindingPath = (data: Record<string, any>, path: string): unknown => {
  let value: unknown = data;
  for (const segment of path.split(".")) {
    if (value == null || (typeof value !== "object" && typeof value !== "function")) return undefined;
    if (FORBIDDEN_PATH_SEGMENTS.has(segment)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(value, segment)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

export type BindingEvaluationResult =
  | { ok: true; kind: "path" | "pipeline"; value: unknown; parsed: ParsedBindingExpression }
  | { ok: false; kind: "invalid"; parsed: ParsedBindingExpression; reason: string };

export const evaluateBindingExpression = (
  expression: string,
  data: Record<string, any>,
  options: {
    index?: number;
    repeaterKey?: string;
    itemKey?: string;
    locale?: string;
    propertyKey?: string;
    usage?: ChaiBindingUsage;
  } = {},
): BindingEvaluationResult => {
  const parsed = parseBindingExpression(expression);
  if (parsed.kind === "invalid") return { ok: false, kind: "invalid", parsed, reason: parsed.reason };

  const path = resolveCollectionItemBindingPath(
    resolveRepeaterBindingPath(parsed.path, options.index ?? -1, options.repeaterKey ?? ""),
    options.itemKey ?? "",
  );
  let value = getValueAtBindingPath(data, path);
  for (const pipe of parsed.pipes) {
    const definition = getRegisteredChaiPipe(pipe.name);
    if (!definition) {
      warnPipeEvaluation(pipe.name, `unknown pipe "${pipe.name}" was skipped`);
      continue;
    }
    if ((options.usage ?? "value") === "value" && definition.returns === "boolean") {
      return {
        ok: false,
        kind: "invalid",
        parsed,
        reason: `Pipe "${pipe.name}" is only available for conditional visibility`,
      };
    }
    const valueType = getChaiPipeValueType(value);
    if (definition.accepts?.length && !definition.accepts.includes("any") && !definition.accepts.includes(valueType)) {
      return {
        ok: false,
        kind: "invalid",
        parsed,
        reason: `Pipe "${pipe.name}" does not accept ${valueType}`,
      };
    }
    try {
      const next = definition.transform({
        value,
        args: pipe.args,
        locale: options.locale || "en",
        propertyKey: options.propertyKey,
      });
      if (next && typeof (next as PromiseLike<unknown>).then === "function") {
        warnPipeEvaluation(pipe.name, `pipe "${pipe.name}" returned a Promise; pipes must be synchronous`);
        return { ok: false, kind: "invalid", parsed, reason: `Pipe "${pipe.name}" must be synchronous` };
      }
      value = next;
    } catch (error) {
      warnPipeEvaluation(pipe.name, `pipe "${pipe.name}" failed`, error);
      return { ok: false, kind: "invalid", parsed, reason: `Pipe "${pipe.name}" failed` };
    }
  }

  return { ok: true, kind: parsed.kind, value, parsed };
};

export const serializePipeLiteral = (value: ChaiPipeLiteral): string => {
  if (typeof value === "string") {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/'/g, "\\'");
    return `'${escaped}'`;
  }
  return String(value);
};

export const serializeBindingPipeline = (path: string, pipes: ParsedChaiPipe[]): string =>
  [
    path,
    ...pipes.map(
      (pipe) => `${pipe.name}${pipe.args.length ? ` ${pipe.args.map(serializePipeLiteral).join(" ")}` : ""}`,
    ),
  ].join(" | ");

export const isChaiPipeAllowedForUsage = (pipe: Readonly<ChaiPipeDefinition>, usage: ChaiBindingUsage): boolean =>
  usage === "visibility" || pipe.returns !== "boolean";

export const isValidBindingTemplate = (value: string, usage: ChaiBindingUsage = "value"): boolean => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{{") || !trimmed.endsWith("}}")) return false;
  const parsed = parseBindingExpression(trimmed.slice(2, -2));
  if (parsed.kind === "invalid") return false;
  return parsed.pipes.every((pipe) => {
    const definition = getRegisteredChaiPipe(pipe.name);
    return !definition || isChaiPipeAllowedForUsage(definition, usage);
  });
};

/** Unregistered pipes render fine (they are skipped), but AI-authored bindings must stick to the catalog. */
export const hasOnlyRegisteredChaiPipes = (parsed: ParsedBindingExpression): boolean =>
  parsed.kind !== "invalid" && parsed.pipes.every((pipe) => Boolean(getRegisteredChaiPipe(pipe.name)));

export const getCompatibleChaiPipes = (
  value: unknown,
  usage: ChaiBindingUsage = "value",
): ReadonlyArray<Readonly<ChaiPipeDefinition>> => {
  const type = getChaiPipeValueType(value);
  return getRegisteredChaiPipes().filter(
    (pipe) =>
      isChaiPipeAllowedForUsage(pipe, usage) &&
      (!pipe.accepts?.length || pipe.accepts.includes("any") || pipe.accepts.includes(type)),
  );
};
