import { defaultRuleRegistry } from "~/builder/hooks/structure-rules";
import { StructureRule } from "~/builder/hooks/use-check-structure";

/**
 * Register a custom structure validation rule
 * @param rule - The structure rule to register
 * @example
 * ```ts
 * registerChaiStructureCheckRule({
 *   name: "custom-rule",
 *   description: "My custom validation rule",
 *   validate: (canvasDocument: Document) => {
 *     const errors = [];
 *     // Your validation logic here
 *     return errors;
 *   }
 * });
 * ```
 */
export const registerChaiStructureCheckRule = (rule: StructureRule): void => {
  defaultRuleRegistry.addRule(rule);
};
