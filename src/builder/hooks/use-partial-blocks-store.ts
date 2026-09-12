/**
 * Partial blocks store - re-exports from modular files
 * @module use-partial-blocks-store
 */

// Re-export everything from the partial-blocks module
export {
  // Utils
  extractPartialIds,
  getPartialDepth,
  isMissingPartialError,
  // Atoms
  partialBlocksAtom,
  partialBlocksListAtom,
  // Hooks
  useCanAddPartial,
  useCheckPartialCanAdd,
  useIsPartialBlockMissing,
  usePartialBlockStatus,
  usePartialBlocksList,
  usePartialBlocksStore,
  usePartialDependencies,
  useWatchPartialBlocks,
  wouldCreateCycle,
} from "./partial-blocks";

// Re-export types
export type { CanAddPartialResult, PartialBlockEntry, PartialBlockList } from "~/types/partial-blocks";
