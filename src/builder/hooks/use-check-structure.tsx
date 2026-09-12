import { useDebouncedCallback } from "@react-hookz/web";
import { useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash-es";
import { useCallback } from "react";
import {
  hasStructureErrorsAtom,
  hasStructureWarningsAtom,
  structureErrorsAtom,
  structureValidationValidAtom,
} from "~/builder/atoms/blocks";
import { canvasIframeAtom } from "~/builder/atoms/ui";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { StructureError, StructureRule, defaultRuleRegistry } from "./structure-rules";

export interface UseCheckStructureOptions {
  enableAccessibilityRules?: boolean;
  customRules?: StructureRule[];
}

export const useCheckStructure = (options: UseCheckStructureOptions = {}) => {
  const validateStructure = useBuilderProp("flags.validateStructure", true);
  const iframe = useAtomValue(canvasIframeAtom) as HTMLIFrameElement | null;
  // Atoms to update
  const setStructureErrors = useSetAtom(structureErrorsAtom);
  const setStructureValidationValid = useSetAtom(structureValidationValidAtom);
  const setHasStructureErrors = useSetAtom(hasStructureErrorsAtom);
  const setHasStructureWarnings = useSetAtom(hasStructureWarningsAtom);

  const validateImmediately = useCallback(() => {
    if (!validateStructure || !iframe) return;

    // Extract document from iframe
    const canvasDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!canvasDocument) return;

    const allErrors: StructureError[] = [];

    // Get rules to apply
    let rulesToApply = defaultRuleRegistry.getRules();

    // Enable accessibility rules if requested
    if (options.enableAccessibilityRules) {
      defaultRuleRegistry.enableAccessibilityRules();
      rulesToApply = defaultRuleRegistry.getRules();
    }

    // Add custom rules if provided
    if (options.customRules && options.customRules.length > 0) {
      rulesToApply.push(...options.customRules);
    }

    // Run all structure validation rules
    rulesToApply.forEach((rule) => {
      try {
        const ruleErrors = rule.validate(canvasDocument);
        allErrors.push(...ruleErrors);
      } catch (error) {
        console.error(`Error running structure rule "${rule.name}":`, error);
      }
    });

    const hasErrors = allErrors.filter((e) => e.severity === "error").length > 0;
    const hasWarnings = allErrors.filter((e) => e.severity === "warning").length > 0;
    const isStructureValid = !hasErrors;

    // Update atoms. Errors get an identity bail: this runs debounced after
    // EVERY block write (use-blocks-store-manager), and a fresh array — even an
    // empty one — notifies every outline row's useStructureValidation
    // subscription, re-rendering the whole outline per keystroke. Keeping the
    // previous identity when the result is unchanged (the overwhelmingly common
    // case while typing) makes the set a no-op for subscribers. The boolean
    // atoms already bail via Object.is.
    setStructureErrors((prev) => (isEqual(prev, allErrors) ? prev : allErrors));
    setStructureValidationValid(isStructureValid);
    setHasStructureErrors(hasErrors);
    setHasStructureWarnings(hasWarnings);
  }, [
    validateStructure,
    iframe,
    options,
    setStructureErrors,
    setStructureValidationValid,
    setHasStructureErrors,
    setHasStructureWarnings,
  ]);

  const runValidation = useDebouncedCallback(
    validateImmediately,
    [
      validateStructure,
      iframe,
      options,
      setStructureErrors,
      setStructureValidationValid,
      setHasStructureErrors,
      setHasStructureWarnings,
    ],
    500, // Reduced from 1000ms for faster feedback
  );

  return runValidation;
};

// Synchronous validation function for use in save operations
export const validateStructureSync = (
  canvasDocument: Document | null | undefined,
  options: UseCheckStructureOptions = {},
): StructureError[] => {
  if (!canvasDocument) return [];

  const allErrors: StructureError[] = [];

  // Get rules to apply
  let rulesToApply = defaultRuleRegistry.getRules();

  // Enable accessibility rules if requested
  if (options.enableAccessibilityRules) {
    defaultRuleRegistry.enableAccessibilityRules();
    rulesToApply = defaultRuleRegistry.getRules();
  }

  // Add custom rules if provided
  if (options.customRules && options.customRules.length > 0) {
    rulesToApply.push(...options.customRules);
  }

  // Run all structure validation rules
  rulesToApply.forEach((rule) => {
    try {
      const ruleErrors = rule.validate(canvasDocument);
      allErrors.push(...ruleErrors);
    } catch (error) {
      console.error(`Error running structure rule "${rule.name}":`, error);
    }
  });

  return allErrors;
};

// Export the rule registry for external use
export { defaultRuleRegistry } from "./structure-rules";
export type { StructureError, StructureRule } from "./structure-rules";
