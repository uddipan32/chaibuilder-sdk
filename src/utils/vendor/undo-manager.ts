/**
 * Minimal undo/redo command stack. Internal replacement for the `undo-manager`
 * npm package (MIT, https://github.com/ArthurClemens/JavaScript-Undo-Manager),
 * keeping the subset of its API we use.
 */

export interface UndoManagerCommand {
  undo: () => void;
  redo: () => void;
}

export class UndoManager {
  private commands: UndoManagerCommand[] = [];
  private index = -1;
  private limit = 0;
  private callback: (() => void) | null = null;

  add(command: UndoManagerCommand): void {
    // Adding a command clears any redo history beyond the current position
    this.commands = this.commands.slice(0, this.index + 1);
    this.commands.push(command);

    if (this.limit > 0 && this.commands.length > this.limit) {
      this.commands = this.commands.slice(this.commands.length - this.limit);
    }

    this.index = this.commands.length - 1;
    this.callback?.();
  }

  undo(): void {
    const command = this.commands[this.index];
    if (!command) return;
    command.undo();
    this.index -= 1;
    this.callback?.();
  }

  redo(): void {
    const command = this.commands[this.index + 1];
    if (!command) return;
    command.redo();
    this.index += 1;
    this.callback?.();
  }

  clear(): void {
    const hadCommands = this.commands.length > 0;
    this.commands = [];
    this.index = -1;
    if (hadCommands) this.callback?.();
  }

  hasUndo(): boolean {
    return this.index >= 0;
  }

  hasRedo(): boolean {
    return this.index < this.commands.length - 1;
  }

  setLimit(limit: number): void {
    this.limit = limit;
  }

  setCallback(callback: () => void): void {
    this.callback = callback;
  }
}

export default UndoManager;
