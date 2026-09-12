import { generateHTML } from "@tiptap/react";
import type { Editor, Extensions, JSONContent } from "@tiptap/react";

/** Name of the tiptap inline atom node that renders a `{{...}}` binding as a badge. */
export const BINDING_NODE_NAME = "chaiBinding";

const BINDING_SPLIT_REGEX = /\{\{(.*?)\}\}/g;

// Private-use unicode delimiters used as placeholders during RTE HTML serialization.
// They pass through HTML serialization un-escaped, so we can splice the raw `{{...}}`
// back in afterwards without the expression's `<`/`>`/`&` chars being entity-escaped.
const SENTINEL_OPEN = "\uE000";
const SENTINEL_CLOSE = "\uE001";

const bindingNode = (expression: string): JSONContent => ({
  type: BINDING_NODE_NAME,
  attrs: { expression: expression.trim() },
});

/** Split a plain string into alternating text / binding inline nodes. */
const inlineNodesFromText = (text: string): JSONContent[] => {
  const nodes: JSONContent[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  BINDING_SPLIT_REGEX.lastIndex = 0;
  while ((match = BINDING_SPLIT_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    nodes.push(bindingNode(match[1]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }
  return nodes;
};

const paragraph = (children: JSONContent[]): JSONContent =>
  children.length ? { type: "paragraph", content: children } : { type: "paragraph" };

/**
 * Coerce RJSF / block prop values into a plain string for the binding editor.
 * `?? ""` is not enough — numbers/booleans/objects still reach `.replace` and crash.
 * Objects/arrays become `""` (not `[object Object]`) so bad formData stays blank.
 */
export const toBindingString = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

/** Parse a value into a single-paragraph doc (newlines collapsed to spaces). */
export const parseSingleLine = (value: unknown): JSONContent => {
  const oneLine = toBindingString(value).replace(/\r?\n/g, " ");
  return { type: "doc", content: [paragraph(inlineNodesFromText(oneLine))] };
};

/** Parse a value into a multi-paragraph doc (one paragraph per line). */
export const parseMultiline = (value: unknown): JSONContent => {
  const lines = toBindingString(value).split(/\r?\n/);
  return { type: "doc", content: lines.map((line) => paragraph(inlineNodesFromText(line))) };
};

const serializeInline = (nodes: JSONContent[] = []): string =>
  nodes
    .map((node) => {
      if (node.type === BINDING_NODE_NAME) return `{{${node.attrs?.expression ?? ""}}}`;
      if (node.type === "hardBreak") return "\n";
      if (node.type === "text") return node.text ?? "";
      return "";
    })
    .join("");

/** Serialize a plain-text (input/textarea) doc back to a `{{...}}` string. */
export const serializePlainDoc = (doc: JSONContent | undefined): string => {
  const paragraphs = doc?.content ?? [];
  return paragraphs.map((para) => serializeInline(para.content)).join("\n");
};

const transformBindingsToSentinels = (node: JSONContent, exprs: string[]): JSONContent => {
  if (node.type === BINDING_NODE_NAME) {
    const index = exprs.push(node.attrs?.expression ?? "") - 1;
    return { type: "text", text: `${SENTINEL_OPEN}${index}${SENTINEL_CLOSE}` };
  }
  if (node.content) {
    return { ...node, content: node.content.map((child) => transformBindingsToSentinels(child, exprs)) };
  }
  return node;
};

/**
 * Serialize an RTE editor to HTML with binding nodes rendered as literal `{{...}}`
 * text (not `<span>` wrappers), preserving the stored HTML format. Browser-only
 * (generateHTML needs a DOM).
 */
export const serializeRteHtml = (editor: Editor): string => {
  const exprs: string[] = [];
  const transformed = transformBindingsToSentinels(editor.getJSON(), exprs);
  let html = generateHTML(transformed, editor.extensionManager.extensions as Extensions);
  exprs.forEach((expr, index) => {
    html = html.split(`${SENTINEL_OPEN}${index}${SENTINEL_CLOSE}`).join(`{{${expr}}}`);
  });
  return html;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("binding-doc parse/serialize", () => {
    it("round-trips pretty-printed JSON, indentation included", () => {
      // The JSON-LD field formats through this editor — losing the leading spaces or the
      // line breaks here would make "Format JSON" a no-op from the user's side.
      const value = '{\n  "@type": "Article",\n  "name": "{{global.title}}"\n}';
      expect(serializePlainDoc(parseMultiline(value))).toBe(value);
    });

    it("round-trips a single-line value with a binding", () => {
      const value = "Hello {{ user.name }} welcome";
      const doc = parseSingleLine(value);
      // expression is trimmed inside the badge
      expect(serializePlainDoc(doc)).toBe("Hello {{user.name}} welcome");
    });

    it("splits text and binding nodes correctly", () => {
      const doc = parseSingleLine("a {{b.c}} d");
      const inline = doc.content![0].content!;
      expect(inline.map((n) => n.type)).toEqual(["text", BINDING_NODE_NAME, "text"]);
      expect(inline[1].attrs).toEqual({ expression: "b.c" });
    });

    it("handles a value that is only a binding", () => {
      const doc = parseSingleLine("{{global.title}}");
      expect(serializePlainDoc(doc)).toBe("{{global.title}}");
    });

    it("handles adjacent bindings with no text between", () => {
      const doc = parseSingleLine("{{a}}{{b}}");
      const inline = doc.content![0].content!;
      expect(inline.map((n) => n.type)).toEqual([BINDING_NODE_NAME, BINDING_NODE_NAME]);
      expect(serializePlainDoc(doc)).toBe("{{a}}{{b}}");
    });

    it("collapses newlines in single-line parse", () => {
      const doc = parseSingleLine("a\nb");
      expect(serializePlainDoc(doc)).toBe("a b");
    });

    it("round-trips multiline values via paragraphs", () => {
      const value = "line one {{a.b}}\nline two\n{{c}}";
      const doc = parseMultiline(value);
      expect(serializePlainDoc(doc)).toBe(value);
    });

    it("serializes empty value to empty string", () => {
      expect(serializePlainDoc(parseSingleLine(""))).toBe("");
      expect(serializePlainDoc(parseSingleLine(undefined))).toBe("");
    });

    it("coerces non-string values without throwing", () => {
      expect(serializePlainDoc(parseSingleLine(null))).toBe("");
      expect(serializePlainDoc(parseSingleLine(0))).toBe("0");
      expect(serializePlainDoc(parseSingleLine(true))).toBe("true");
      expect(serializePlainDoc(parseSingleLine({ href: "/x" }))).toBe("");
      expect(serializePlainDoc(parseSingleLine(["a", "b"]))).toBe("");
      expect(serializePlainDoc(parseMultiline(42))).toBe("42");
    });
  });
}
