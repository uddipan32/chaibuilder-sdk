/**
 * Core block types that the AI-HTML representation renders as plain semantic
 * HTML (everything else becomes a `<chai-{kebab-type}>` web component). Kept in
 * one place so the client HTML builder (use-blocks-html-for-ai) and the
 * server-side converter (blocks-to-ai-html) can never drift apart.
 */
export const CORE_BLOCKS: readonly string[] = [
  "Box",
  "Button",
  "Checkbox",
  "Divider",
  "EmptyBox",
  "Form",
  "FormButton",
  "Heading",
  "Input",
  "Label",
  "LineBreak",
  "Link",
  "List",
  "ListItem",
  "Paragraph",
  "Radio",
  "RichText",
  "Select",
  "Span",
  "Text",
  "TextArea",
  "Video",
];

export const CORE_BLOCKS_SET: ReadonlySet<string> = new Set(CORE_BLOCKS);
