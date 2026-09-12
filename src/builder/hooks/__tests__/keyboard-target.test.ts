/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { isTextEntryTarget } from "~/builder/hooks/keyboard-target";

const dispatchKeydownOn = (element: Element) => {
  if (!element.parentElement) {
    document.body.appendChild(element);
  }
  const event = new KeyboardEvent("keydown", { key: "z", bubbles: true });
  Object.defineProperty(event, "target", { value: element });
  return event;
};

describe("isTextEntryTarget", () => {
  it.each(["text", "search", "url", "tel", "email", "password", "number", "date", "datetime-local", "month", "week", "time"])(
    "returns true for input[type=%s]",
    (type) => {
      const input = document.createElement("input");
      input.type = type;
      expect(isTextEntryTarget(dispatchKeydownOn(input))).toBe(true);
    },
  );

  it("returns true for an input with no type set", () => {
    const input = document.createElement("input");
    expect(isTextEntryTarget(dispatchKeydownOn(input))).toBe(true);
  });

  it.each(["checkbox", "radio", "range", "color", "file", "button", "submit", "reset"])(
    "returns false for input[type=%s]",
    (type) => {
      const input = document.createElement("input");
      input.type = type;
      expect(isTextEntryTarget(dispatchKeydownOn(input))).toBe(false);
    },
  );

  it("returns true for textarea", () => {
    const textarea = document.createElement("textarea");
    expect(isTextEntryTarget(dispatchKeydownOn(textarea))).toBe(true);
  });

  it("returns false for select", () => {
    const select = document.createElement("select");
    expect(isTextEntryTarget(dispatchKeydownOn(select))).toBe(false);
  });

  it("returns true for a contenteditable element", () => {
    const div = document.createElement("div");
    div.contentEditable = "true";
    expect(isTextEntryTarget(dispatchKeydownOn(div))).toBe(true);
  });

  it("returns true for a child of a contenteditable element", () => {
    const wrapper = document.createElement("div");
    wrapper.contentEditable = "true";
    const child = document.createElement("span");
    wrapper.appendChild(child);
    document.body.appendChild(wrapper);
    expect(isTextEntryTarget(dispatchKeydownOn(child))).toBe(true);
  });

  it("returns false for a plain div", () => {
    const div = document.createElement("div");
    expect(isTextEntryTarget(dispatchKeydownOn(div))).toBe(false);
  });

  it("returns false for the canvas <iframe> element — builder shortcuts (copy/paste) must run there", () => {
    // Regression: the removed `shouldIgnoreKeyEvent` blanket-ignored iframe
    // targets, which killed Cmd+C/V because selecting a block puts focus on the
    // <iframe> element in the parent document. Only text-entry targets are ignored now.
    const iframe = document.createElement("iframe");
    expect(isTextEntryTarget(dispatchKeydownOn(iframe))).toBe(false);
  });

  it("returns false when the target is not an Element", () => {
    const event = new KeyboardEvent("keydown", { key: "z" });
    Object.defineProperty(event, "target", { value: null });
    expect(isTextEntryTarget(event)).toBe(false);
  });
});
