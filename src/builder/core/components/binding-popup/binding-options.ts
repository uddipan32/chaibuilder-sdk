export type BindingValueType = "value" | "array" | "object";

export type BindingOption = {
  key: string;
  value: any;
  type: BindingValueType;
};

export const getBindingValueType = (value: any): BindingValueType => {
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) return "object";
  return "value";
};

/** Short inline preview shown next to a key; only primitives have one. */
export const getBindingPreview = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

export const compareBindingFieldNames = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });

/** Human type label used by the suggestion dropdowns (`array`, `JSON`, `string`, ...). */
export const getBindingTypeLabel = (value: any): string => {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "object") return "JSON";
  return typeof value;
};
