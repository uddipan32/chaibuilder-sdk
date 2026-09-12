import { atom, useAtomValue, useSetAtom } from "jotai";
import { noop } from "lodash-es";
import { useCallback, useEffect, useMemo } from "react";
import UndoManager from "~/utils/vendor/undo-manager";
import { builderStore } from "~/builder/atoms/store";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { inlineEditingActiveAtom } from "~/builder/hooks/use-inline-editing";
import { builderSaveStateAtom } from "~/builder/hooks/use-save-page";

const undoManager = new UndoManager();
undoManager.setLimit(50);

/**
 * Commit any active inline (canvas) text editing before traveling history.
 * The undo/redo triggers live in the parent frame while the contenteditable
 * lives in the canvas iframe — clicking the parent frame does NOT synchronously
 * blur the iframe's editor, so without this the undo would run against
 * not-yet-committed history and the editor's late blur commit would then
 * re-apply the edited content on top of the undone state.
 * Blurring dispatches the blur synchronously, so the editor's close handler
 * commits its single history entry before undo/redo proceeds.
 */
const commitActiveInlineEditing = () => {
  if (!builderStore.get(inlineEditingActiveAtom)) return;
  const iframe = document.getElementById("canvas-iframe") as HTMLIFrameElement | null;
  const active = iframe?.contentDocument?.activeElement as HTMLElement | null;
  active?.blur?.();
};

export { undoManager };

const undoRedoStateAtom = atom({
  canUndo: false,
  canRedo: false,
});

/**
 * Reactive undo/redo availability — for UI (e.g. topbar buttons) that must
 * re-render when history changes. Action hooks use useUndoManager, which is
 * subscription-free on purpose (it sits in every block's update path).
 */
export const useUndoRedoState = () => useAtomValue(undoRedoStateAtom);

const useUndoManager = () => {
  // PERF: setters only — subscribing to save/undo state here would re-render
  // every consumer of the block update hooks on each history commit
  const setSaveState = useSetAtom(builderSaveStateAtom);
  const setUndoRedoState = useSetAtom(undoRedoStateAtom);
  const emitSaveState = useBuilderProp("onSaveStateChange", noop);

  const updateUndoRedoState = useCallback(() => {
    const newState = {
      canUndo: undoManager.hasUndo(),
      canRedo: undoManager.hasRedo(),
    };
    setUndoRedoState(newState);
    setSaveState("UNSAVED");
    emitSaveState("UNSAVED");
  }, [setUndoRedoState, setSaveState, emitSaveState]);

  useEffect(() => {
    undoManager.setCallback(updateUndoRedoState);
    return () => {
      undoManager.setCallback(noop);
    };
  }, [updateUndoRedoState]);

  const add = useCallback(
    (action: any) => {
      undoManager.add(action);
      updateUndoRedoState();
    },
    [updateUndoRedoState],
  );

  const undo = useCallback(() => {
    commitActiveInlineEditing();
    undoManager.undo();
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    commitActiveInlineEditing();
    undoManager.redo();
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const clear = useCallback(() => {
    undoManager.clear();
    setUndoRedoState({
      canUndo: false,
      canRedo: false,
    });
  }, [setUndoRedoState]);

  return useMemo(
    () => ({
      add,
      undo,
      redo,
      // Read the singleton directly — always current, no subscription.
      // Use useUndoRedoState for reactive UI state.
      hasUndo: () => undoManager.hasUndo(),
      hasRedo: () => undoManager.hasRedo(),
      clear,
    }),
    [add, undo, redo, clear],
  );
};

export { useUndoManager };
