import type { ChaiRepeaterFieldType, ChaiRepeaterOperator } from "~/types/repeater-data";

const DEFAULT_OPERATOR_LABELS: Record<ChaiRepeaterOperator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  greater_than: "greater than",
  greater_than_equal: "greater or equal",
  less_than: "less than",
  less_than_equal: "less or equal",
  in: "any of",
  not_in: "none of",
};

const DATE_OPERATOR_LABELS: Partial<Record<ChaiRepeaterOperator, string>> = {
  equals: "on",
  greater_than: "after",
  greater_than_equal: "on or after",
  less_than: "before",
  less_than_equal: "on or before",
};

export const operatorLabel = (operator: ChaiRepeaterOperator, fieldType: ChaiRepeaterFieldType): string => {
  if (fieldType === "date") return DATE_OPERATOR_LABELS[operator] ?? DEFAULT_OPERATOR_LABELS[operator];
  return DEFAULT_OPERATOR_LABELS[operator];
};
