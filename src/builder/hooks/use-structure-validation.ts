import { useAtom } from "jotai";
import {
  hasStructureErrorsAtom,
  hasStructureWarningsAtom,
  structureErrorCountAtom,
  structureErrorsAtom,
  structureErrorsByBlockAtom,
  structureValidationValidAtom,
  structureWarningCountAtom,
} from "~/builder/atoms/blocks";

export const useStructureValidation = () => {
  const [errors] = useAtom(structureErrorsAtom);
  const [isValid] = useAtom(structureValidationValidAtom);
  const [hasErrors] = useAtom(hasStructureErrorsAtom);
  const [hasWarnings] = useAtom(hasStructureWarningsAtom);
  const [errorCount] = useAtom(structureErrorCountAtom);
  const [warningCount] = useAtom(structureWarningCountAtom);
  const [errorsByBlock] = useAtom(structureErrorsByBlockAtom);

  return {
    errors,
    isValid,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount,
    errorsByBlock,
    // Helper functions
    getBlockErrors: (blockId: string) => errorsByBlock[blockId] || [],
    getErrorsBySeverity: (severity: "error" | "warning") => errors.filter((e) => e.severity === severity),
    getErrorMessages: () => errors.map((e) => e.message),
    getErrorMessagesBySeverity: (severity: "error" | "warning") =>
      errors.filter((e) => e.severity === severity).map((e) => e.message),
    // Get all error messages for display
    getAllErrorMessages: () => ({
      errors: errors.filter((e) => e.severity === "error").map((e) => e.message),
      warnings: errors.filter((e) => e.severity === "warning").map((e) => e.message),
    }),
  };
};
