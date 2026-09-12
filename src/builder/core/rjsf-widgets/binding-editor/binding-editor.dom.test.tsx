// @vitest-environment happy-dom
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { BINDING_NODE_NAME, serializeRteHtml } from "./binding-doc";
import { ChaiBindingNode, tokenizeBindings } from "./binding-node";

/**
 * Runtime tests for the tiptap layer. Run under happy-dom:
 *   npx vitest --run src/builder/core/rjsf-widgets/binding-editor/binding-editor.dom.test.tsx
 */

const makeEditor = (content: string) => {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new Editor({ element, extensions: [StarterKit, ChaiBindingNode], content });
};

const countBindingNodes = (editor: Editor): number => {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === BINDING_NODE_NAME) count++;
  });
  return count;
};

describe("tiptap binding node (happy-dom)", () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it("tokenizes literal {{...}} text in loaded content into a badge node", () => {
    editor = makeEditor("<p>Hi {{ global.title }}!</p>");
    expect(countBindingNodes(editor)).toBe(0);
    tokenizeBindings(editor);
    expect(countBindingNodes(editor)).toBe(1);
  });

  it("serializes a badge node back to literal {{expr}} (not a span wrapper)", () => {
    editor = makeEditor("<p>Hi {{global.title}}</p>");
    tokenizeBindings(editor);
    const html = serializeRteHtml(editor);
    expect(html).toContain("{{global.title}}");
    expect(html).not.toContain("data-chai-binding");
    expect(html).toContain("<p>");
  });

  it("preserves comparison operators in the expression through serialization", () => {
    editor = makeEditor("<p>{{ count > 2 ? 'a' : 'b' }}</p>");
    tokenizeBindings(editor);
    const html = serializeRteHtml(editor);
    // The `>` must survive as-is, not become &gt;
    expect(html).toContain("{{count > 2 ? 'a' : 'b'}}");
  });

  it("insertChaiBinding command inserts a badge node", () => {
    editor = makeEditor("<p></p>");
    (editor.commands as any).insertChaiBinding("global.name");
    expect(countBindingNodes(editor)).toBe(1);
    expect(serializeRteHtml(editor)).toContain("{{global.name}}");
  });

  it("tokenizes on subsequent typing (closing brace) via the plugin", () => {
    editor = makeEditor("<p></p>");
    editor.commands.setContent("<p>{{global.a}}</p>");
    // setContent triggers a doc change; the tokenizer plugin runs on the transaction.
    expect(countBindingNodes(editor)).toBe(1);
  });

  // Faithfully drives ProseMirror's input-rule path (real keystroke text input) rather
  // than a raw dispatch, so this covers the `addInputRules` commit for free-form exprs.
  const typeThroughInputRules = (ed: Editor, text: string) => {
    for (const ch of text) {
      const { from } = ed.state.selection;
      const handled = ed.view.someProp("handleTextInput", (f) => (f as any)(ed.view, from, from, ch));
      if (!handled) ed.view.dispatch(ed.state.tr.insertText(ch, from));
    }
  };

  it("commits a free-form expression when the closing }} is typed (input rule)", () => {
    editor = makeEditor("<p></p>");
    editor.commands.focus();
    typeThroughInputRules(editor, "{{ price > 2 ? 'a' : 'b' }}");
    expect(countBindingNodes(editor)).toBe(1);
    expect(serializeRteHtml(editor)).toContain("{{price > 2 ? 'a' : 'b'}}");
  });

  it("does not double-tokenize (input rule + plugin) on typed close", () => {
    editor = makeEditor("<p></p>");
    editor.commands.focus();
    typeThroughInputRules(editor, "prefix {{a.b}}");
    expect(countBindingNodes(editor)).toBe(1);
  });
});
