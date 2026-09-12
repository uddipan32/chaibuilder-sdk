import { Redo2, Undo2 } from "lucide-react";
import { useUndoManager, useUndoRedoState } from "~/builder/hooks/history/use-undo-manager";
import { Button } from "~/components/ui/button";

export const UndoRedo = () => {
  const { undo, redo } = useUndoManager();
  const { canUndo, canRedo } = useUndoRedoState();
  return (
    <div className="flex items-center gap-px px-px">
      <Button disabled={!canUndo} size="icon-sm" onClick={undo} variant="ghost">
        <Undo2 />
      </Button>
      <Button disabled={!canRedo} onClick={redo} size="icon-sm" variant="ghost">
        <Redo2 />
      </Button>
    </div>
  );
};
