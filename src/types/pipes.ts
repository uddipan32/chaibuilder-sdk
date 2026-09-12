export type ChaiPipeLiteral = string | number | boolean | null;

export type ChaiPipeValueType = "any" | "string" | "number" | "boolean" | "array" | "object" | "date" | "null";

export type ChaiPipeArgumentDefinition = {
  name: string;
  label?: string;
  description?: string;
  type: "string" | "number" | "boolean" | "literal" | "select";
  required?: boolean;
  default?: ChaiPipeLiteral;
  options?: Array<{ label: string; value: ChaiPipeLiteral }>;
};

export type ChaiPipeTransformInput = {
  value: unknown;
  args: readonly ChaiPipeLiteral[];
  locale: string;
  propertyKey?: string;
};

export type ChaiPipeDefinition = {
  name: string;
  label: string;
  description?: string;
  accepts?: ChaiPipeValueType[];
  returns?: ChaiPipeValueType;
  args?: ChaiPipeArgumentDefinition[];
  transform: (input: ChaiPipeTransformInput) => unknown;
};
