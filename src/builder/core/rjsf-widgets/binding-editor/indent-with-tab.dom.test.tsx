// @vitest-environment happy-dom
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { parseMultiline, serializePlainDoc } from "./binding-doc";
import { ChaiBindingNode } from "./binding-node";
import { createBindingSuggestionExtension, isBindingSuggestionActive } from "./binding-suggestion";
import { IndentWithTab } from "./use-binding-editor";

/**
 * The JSON field's tab contract, kept when the textarea became a binding editor:
 * Tab indents by two spaces instead of moving focus out of the field.
 */

const makeEditor = (value: string) => {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [StarterKit, ChaiBindingNode, IndentWithTab],
    content: parseMultiline(value),
  });
};

/** Drives the real keymap plugin, so a `false` here means the key would escape the field. */
const pressTab = (editor: Editor, shiftKey = false): boolean =>
  editor.view.someProp("handleKeyDown", (handler) =>
    (handler as any)(editor.view, new KeyboardEvent("keydown", { key: "Tab", shiftKey })),
  ) ?? false;

const valueOf = (editor: Editor) => serializePlainDoc(editor.getJSON());

describe("binding editor tab indentation (happy-dom)", () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it("inserts two spaces at the cursor instead of moving focus", () => {
    editor = makeEditor('{\n"a": 1\n}');
    editor.commands.setTextSelection(4); // start of line 2
    expect(pressTab(editor)).toBe(true);
    expect(valueOf(editor)).toBe('{\n  "a": 1\n}');
  });

  it("indents every line the selection touches", () => {
    editor = makeEditor('{\n"a": 1,\n"b": 2\n}');
    // From inside line 2 to inside line 3.
    editor.commands.setTextSelection({ from: 5, to: 16 });
    pressTab(editor);
    expect(valueOf(editor)).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("unindents the selected lines on Shift-Tab", () => {
    editor = makeEditor('{\n  "a": 1,\n  "b": 2\n}');
    editor.commands.setTextSelection({ from: 5, to: 18 });
    pressTab(editor, true);
    expect(valueOf(editor)).toBe('{\n"a": 1,\n"b": 2\n}');
  });

  it("unindents the current line when nothing is selected", () => {
    editor = makeEditor('{\n  "a": 1\n}');
    editor.commands.setTextSelection(6);
    expect(pressTab(editor, true)).toBe(true);
    expect(valueOf(editor)).toBe('{\n"a": 1\n}');
  });

  it("swallows Shift-Tab on an already-unindented line rather than escaping the field", () => {
    editor = makeEditor('{\n"a": 1\n}');
    editor.commands.setTextSelection(4);
    expect(pressTab(editor, true)).toBe(true);
    expect(valueOf(editor)).toBe('{\n"a": 1\n}');
  });

  it("leaves binding badges intact while indenting", () => {
    editor = makeEditor('{\n"a": "{{global.title}}"\n}');
    editor.commands.setTextSelection(4);
    pressTab(editor);
    expect(valueOf(editor)).toBe('{\n  "a": "{{global.title}}"\n}');
  });

  it("leaves Tab to the {{ suggestion dropdown while it is open", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        ChaiBindingNode,
        IndentWithTab,
        createBindingSuggestionExtension(() => [
          { path: "global.title", label: "title", type: "string", drillable: false },
        ]),
      ],
      content: parseMultiline(""),
    });
    editor.commands.focus();
    editor.view.dispatch(editor.state.tr.insertText("{{"));
    expect(isBindingSuggestionActive(editor.state)).toBe(true);

    // Tab is the dropdown's "accept suggestion" key — indentation must not swallow it.
    pressTab(editor);
    expect(valueOf(editor)).toBe("{{");
  });

  it("is opt-in — an editor without the extension lets Tab move focus", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    editor = new Editor({ element, extensions: [StarterKit, ChaiBindingNode], content: parseMultiline("a\nb") });
    expect(pressTab(editor)).toBe(false);
  });
});
