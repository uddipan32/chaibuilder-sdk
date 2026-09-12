import { parseBindingExpression, serializePipeLiteral } from "~/render/binding-pipes";
import type { ChaiBlock } from "~/types/common";

const BINDING_REGEX = /\{\{(.*?)\}\}/g;

export type ChaiBindingAnalysis = {
  blockId: string;
  propertyPath: string;
  expression: string;
  classification: "path" | "pipe" | "invalid";
  reason?: string;
  suggestedConversion?: string;
};

const literalPattern = String.raw`(?:'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|true|false|null)`;
const pathPattern = String.raw`([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)`;

const convertLiteral = (value: string): string => {
  if (value.startsWith('"')) {
    try {
      return serializePipeLiteral(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return value;
};

export const suggestChaiBindingConversion = (expression: string): string | undefined => {
  const trimmed = expression.trim();
  const method = new RegExp(`^${pathPattern}\\.(toUpperCase|toLowerCase|trim)\\(\\)$`).exec(trimmed);
  if (method) {
    const pipe = { toUpperCase: "uppercase", toLowerCase: "lowercase", trim: "trim" }[method[2]];
    return `${method[1]} | ${pipe}`;
  }

  const join = new RegExp(`^${pathPattern}\\.join\\((${literalPattern})\\)$`).exec(trimmed);
  if (join) return `${join[1]} | join ${convertLiteral(join[2])}`;

  const fallback = new RegExp(`^${pathPattern}\\s*\\?\\?\\s*(${literalPattern})$`).exec(trimmed);
  if (fallback) return `${fallback[1]} | default ${convertLiteral(fallback[2])}`;

  const comparison = new RegExp(`^${pathPattern}\\s*(===|!==|>=|<=|>|<)\\s*(${literalPattern})$`).exec(trimmed);
  if (comparison) {
    const pipe = { "===": "equals", "!==": "notEquals", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" }[comparison[2]];
    return `${comparison[1]} | ${pipe} ${convertLiteral(comparison[3])}`;
  }
  return undefined;
};

const analyzeValue = (value: unknown, blockId: string, propertyPath: string, analyses: ChaiBindingAnalysis[]): void => {
  if (typeof value === "string") {
    BINDING_REGEX.lastIndex = 0;
    for (const match of value.matchAll(BINDING_REGEX)) {
      const expression = match[1].trim();
      const parsed = parseBindingExpression(expression);
      analyses.push({
        blockId,
        propertyPath,
        expression,
        classification: parsed.kind === "pipeline" ? "pipe" : parsed.kind,
        ...(parsed.kind === "invalid"
          ? { reason: parsed.reason, suggestedConversion: suggestChaiBindingConversion(expression) }
          : {}),
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => analyzeValue(item, blockId, `${propertyPath}[${index}]`, analyses));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      analyzeValue(item, blockId, propertyPath ? `${propertyPath}.${key}` : key, analyses),
    );
  }
};

export const analyzeChaiBindings = (blocks: ChaiBlock[]): ChaiBindingAnalysis[] => {
  const analyses: ChaiBindingAnalysis[] = [];
  blocks.forEach((block) => analyzeValue(block, block._id, "", analyses));
  return analyses;
};
