import type { ChaiPipeDefinition, ChaiPipeLiteral, ChaiPipeValueType } from "~/types/pipes";

const PIPE_NAME_REGEX = /^[a-z][A-Za-z0-9]*$/;
const REGISTERED_CHAI_PIPES = new Map<string, ChaiPipeDefinition>();
const WARNED_MESSAGES = new Set<string>();

const warnOnce = (key: string, message: string, error?: unknown) => {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (WARNED_MESSAGES.has(key)) return;
  WARNED_MESSAGES.add(key);
  console.warn(message, ...(error === undefined ? [] : [error]));
};

const emptyValue = (value: unknown) => value == null || value === "" || (Array.isArray(value) && value.length === 0);

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const fractionDigits = (value: ChaiPipeLiteral | undefined): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = toFiniteNumber(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0 || parsed > 20) return undefined;
  return parsed;
};

const formatNumber = (value: unknown, locale: string, digits?: ChaiPipeLiteral): string => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return "";
  const precision = fractionDigits(digits);
  return new Intl.NumberFormat(locale || "en", {
    ...(precision === undefined ? {} : { minimumFractionDigits: precision, maximumFractionDigits: precision }),
  }).format(numeric);
};

const stringArg = (value: ChaiPipeLiteral | undefined, fallback = "") => (typeof value === "string" ? value : fallback);

const NON_DIGIT_REGEX = /\D/g;

/** Formats 10-digit NANP numbers (with an optional 1 country code); anything else is left untouched. */
export const formatTelephone = (value: unknown): string => {
  const text = String(value ?? "").trim();
  const digits = text.replace(NON_DIGIT_REGEX, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10) return text;
  const formatted = `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  return national === digits ? formatted : `+1 ${formatted}`;
};

const builtIns: ChaiPipeDefinition[] = [
  {
    name: "default",
    label: "Default",
    description: "Use a fallback for null, undefined, or empty values.",
    accepts: ["any"],
    returns: "any",
    args: [{ name: "value", label: "Fallback", type: "literal", required: true, default: "" }],
    transform: ({ value, args }) => (emptyValue(value) ? args[0] : value),
  },
  {
    name: "or",
    label: "Or",
    description: "Use a fallback for any falsy value, like value || fallback.",
    accepts: ["any"],
    returns: "any",
    args: [{ name: "value", label: "Fallback", type: "literal", required: true, default: "" }],
    transform: ({ value, args }) => (value ? value : args[0]),
  },
  {
    name: "trim",
    label: "Trim",
    accepts: ["string"],
    returns: "string",
    transform: ({ value }) => String(value ?? "").trim(),
  },
  {
    name: "uppercase",
    label: "Uppercase",
    accepts: ["string"],
    returns: "string",
    transform: ({ value }) => String(value ?? "").toUpperCase(),
  },
  {
    name: "lowercase",
    label: "Lowercase",
    accepts: ["string"],
    returns: "string",
    transform: ({ value }) => String(value ?? "").toLowerCase(),
  },
  {
    name: "capitalize",
    label: "Capitalize",
    accepts: ["string"],
    returns: "string",
    transform: ({ value }) => {
      const text = String(value ?? "");
      return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
    },
  },
  {
    name: "join",
    label: "Join",
    accepts: ["array"],
    returns: "string",
    args: [{ name: "separator", label: "Separator", type: "string", default: "," }],
    transform: ({ value, args }) => (Array.isArray(value) ? value.join(stringArg(args[0], ",")) : ""),
  },
  {
    name: "number",
    label: "Number",
    accepts: ["number", "string"],
    returns: "string",
    args: [{ name: "fractionDigits", label: "Decimal places", type: "number" }],
    transform: ({ value, args, locale }) => formatNumber(value, locale, args[0]),
  },
  {
    name: "telephone",
    label: "Telephone",
    description: "Format a phone number for display.",
    accepts: ["number", "string"],
    returns: "string",
    transform: ({ value }) => formatTelephone(value),
  },
  {
    name: "currency",
    label: "Currency",
    accepts: ["number", "string"],
    returns: "string",
    args: [
      { name: "currency", label: "Currency", type: "string", required: true, default: "USD" },
      { name: "fractionDigits", label: "Decimal places", type: "number" },
    ],
    transform: ({ value, args, locale }) => {
      const numeric = toFiniteNumber(value);
      const currency = stringArg(args[0], "USD").toUpperCase();
      if (numeric === null || !/^[A-Z]{3}$/.test(currency)) return "";
      const precision = fractionDigits(args[1]);
      try {
        return new Intl.NumberFormat(locale || "en", {
          style: "currency",
          currency,
          ...(precision === undefined ? {} : { minimumFractionDigits: precision, maximumFractionDigits: precision }),
        }).format(numeric);
      } catch {
        return "";
      }
    },
  },
  {
    name: "date",
    label: "Date",
    accepts: ["date", "string", "number"],
    returns: "string",
    args: [
      {
        name: "style",
        label: "Style",
        type: "select",
        default: "medium",
        options: ["short", "medium", "long", "full"].map((value) => ({ label: value, value })),
      },
      { name: "timeZone", label: "Timezone", type: "string", default: "UTC" },
    ],
    transform: ({ value, args, locale }) => {
      const parsed = value instanceof Date ? value : new Date(value as any);
      if (Number.isNaN(parsed.getTime())) return "";
      const style = stringArg(args[0], "medium") as "short" | "medium" | "long" | "full";
      if (!["short", "medium", "long", "full"].includes(style)) return "";
      try {
        return new Intl.DateTimeFormat(locale || "en", {
          dateStyle: style,
          timeZone: stringArg(args[1], "UTC"),
        }).format(parsed);
      } catch {
        return "";
      }
    },
  },
  {
    name: "equals",
    label: "Equals",
    accepts: ["any"],
    returns: "boolean",
    args: [{ name: "value", label: "Value", type: "literal", required: true, default: "" }],
    transform: ({ value, args }) => Object.is(value, args[0]),
  },
  {
    name: "notEquals",
    label: "Does not equal",
    accepts: ["any"],
    returns: "boolean",
    args: [{ name: "value", label: "Value", type: "literal", required: true, default: "" }],
    transform: ({ value, args }) => !Object.is(value, args[0]),
  },
  // Loose (JS `==`/`!=`) variants — the desugar target for authored `{{x == 'y'}}` / `{{x != 'y'}}`
  // visibility conditions carried over from the pre-v4 Eta engine, which compared with loose
  // equality. Kept distinct from `equals`/`notEquals` (Object.is) so `===`/`!==` stay strict and
  // so a string-vs-number provider value (`"2026" == 2026`) or the `x == null` idiom keep matching
  // the way they did under Eta.
  {
    name: "looseEquals",
    label: "Equals (loose ==)",
    description: "JS loose equality: coerces types, and matches both null and undefined.",
    accepts: ["any"],
    returns: "boolean",
    args: [{ name: "value", label: "Value", type: "literal", required: true, default: "" }],
    // Intentional loose equality to match legacy Eta `==`.
    transform: ({ value, args }) => value == args[0],
  },
  {
    name: "looseNotEquals",
    label: "Not equals (loose !=)",
    description: "JS loose inequality: coerces types, and treats null and undefined as equal.",
    accepts: ["any"],
    returns: "boolean",
    args: [{ name: "value", label: "Value", type: "literal", required: true, default: "" }],
    // Intentional loose inequality to match legacy Eta `!=`.
    transform: ({ value, args }) => value != args[0],
  },
  ...(["gt", "gte", "lt", "lte"] as const).map<ChaiPipeDefinition>((name) => ({
    name,
    label: { gt: "Greater than", gte: "Greater or equal", lt: "Less than", lte: "Less or equal" }[name],
    accepts: ["number", "string"],
    returns: "boolean",
    args: [{ name: "value", label: "Value", type: "number", required: true, default: 0 }],
    transform: ({ value, args }) => {
      const left = toFiniteNumber(value);
      const right = toFiniteNumber(args[0]);
      if (left === null || right === null) return false;
      if (name === "gt") return left > right;
      if (name === "gte") return left >= right;
      if (name === "lt") return left < right;
      return left <= right;
    },
  })),
  {
    name: "not",
    label: "Not",
    accepts: ["any"],
    returns: "boolean",
    transform: ({ value }) => !Boolean(value),
  },
  {
    name: "truthy",
    label: "Truthy",
    accepts: ["any"],
    returns: "boolean",
    transform: ({ value }) => Boolean(value),
  },
  {
    name: "empty",
    label: "Empty",
    accepts: ["any"],
    returns: "boolean",
    transform: ({ value }) => emptyValue(value),
  },
  {
    name: "notEmpty",
    label: "Not empty",
    accepts: ["any"],
    returns: "boolean",
    transform: ({ value }) => !emptyValue(value),
  },
];

export const registerChaiPipe = (definition: ChaiPipeDefinition): void => {
  if (!PIPE_NAME_REGEX.test(definition.name)) {
    throw new Error(`Invalid Chai pipe name: ${definition.name}`);
  }
  if (typeof definition.transform !== "function") {
    throw new Error(`Chai pipe "${definition.name}" requires a transform function`);
  }
  REGISTERED_CHAI_PIPES.set(definition.name, Object.freeze({ ...definition }));
};

export const getRegisteredChaiPipes = (): ReadonlyArray<Readonly<ChaiPipeDefinition>> =>
  Array.from(REGISTERED_CHAI_PIPES.values());

export const getRegisteredChaiPipe = (name: string): Readonly<ChaiPipeDefinition> | undefined =>
  REGISTERED_CHAI_PIPES.get(name);

export const warnPipeEvaluation = (key: string, message: string, error?: unknown): void => {
  warnOnce(`pipe:${key}`, `[chai] ${message}`, error);
};

export const getChaiPipeValueType = (value: unknown): ChaiPipeValueType => {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return "date";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "any";
};

for (const definition of builtIns) registerChaiPipe(definition);
