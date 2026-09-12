import { describe, expect, it, vi } from "vitest";
import UndoManager from "./undo-manager";

const counterCommand = (state: { value: number }) => ({
  undo: () => {
    state.value -= 1;
  },
  redo: () => {
    state.value += 1;
  },
});

describe("UndoManager", () => {
  it("starts with no undo or redo available", () => {
    const um = new UndoManager();
    expect(um.hasUndo()).toBe(false);
    expect(um.hasRedo()).toBe(false);
    // undo/redo on an empty stack are safe no-ops
    expect(() => {
      um.undo();
      um.redo();
    }).not.toThrow();
  });

  it("undoes and redoes commands in order", () => {
    const state = { value: 0 };
    const um = new UndoManager();
    um.add(counterCommand(state));
    state.value += 1;
    um.add(counterCommand(state));
    state.value += 1;

    expect(state.value).toBe(2);
    um.undo();
    um.undo();
    expect(state.value).toBe(0);
    expect(um.hasUndo()).toBe(false);
    expect(um.hasRedo()).toBe(true);

    um.redo();
    um.redo();
    expect(state.value).toBe(2);
    expect(um.hasRedo()).toBe(false);
  });

  it("clears the redo branch when a new command is added after undo", () => {
    const state = { value: 0 };
    const um = new UndoManager();
    um.add(counterCommand(state));
    um.add(counterCommand(state));
    um.undo();
    expect(um.hasRedo()).toBe(true);

    um.add(counterCommand(state));
    expect(um.hasRedo()).toBe(false);
    // one original command + the new one remain undoable
    um.undo();
    um.undo();
    expect(um.hasUndo()).toBe(false);
  });

  it("drops the oldest commands beyond the limit", () => {
    const state = { value: 0 };
    const um = new UndoManager();
    um.setLimit(2);
    um.add(counterCommand(state));
    um.add(counterCommand(state));
    um.add(counterCommand(state));

    um.undo();
    um.undo();
    expect(um.hasUndo()).toBe(false); // third command was trimmed
  });

  it("invokes the callback on add, undo, and redo", () => {
    const callback = vi.fn();
    const state = { value: 0 };
    const um = new UndoManager();
    um.setCallback(callback);

    um.add(counterCommand(state));
    expect(callback).toHaveBeenCalledTimes(1);
    um.undo();
    expect(callback).toHaveBeenCalledTimes(2);
    um.redo();
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("clear empties the history", () => {
    const state = { value: 0 };
    const um = new UndoManager();
    um.add(counterCommand(state));
    um.clear();
    expect(um.hasUndo()).toBe(false);
    expect(um.hasRedo()).toBe(false);
  });
});
