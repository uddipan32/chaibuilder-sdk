import { TextIcon } from "@radix-ui/react-icons";
import { isNull } from "lodash-es";
import * as React from "react";
import { useInnerHtml } from "~/web-blocks/use-inner-html";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import { addForcedClasses } from "./helper";

export type ParagraphProps = {
  styles: ChaiStyles;
  content: string;
};

const P_TAG = /<(\/?)p\b[^>]*>/gi;
const OPENING_P = /^<p\b[^>]*>/i;
const CLOSING_P = /<\/p>$/i;

// Elements that a `<p>` may not contain. The browser closes the open paragraph
// when it meets one, so the wrapper survives as a stray empty `<p>`.
const BLOCK_LEVEL =
  /<(?:h[1-6]|p|ul|ol|blockquote|pre|table|div|hr|figure|section|article|address|dl|form)\b/i;

/**
 * A binding that resolves to block-level HTML is often authored wrapped in a
 * paragraph — `<p>{{doc.content}}</p>`. Once the binding resolves, that markup is
 * invalid, and the parser hoists the content out and leaves an empty `<p>` behind.
 * Drop the wrapper so the block's own `div` is the container.
 *
 * Only a paragraph spanning the *whole* value is unwrapped, and only when its
 * content is block-level, so ordinary `<p>text</p>` is left as-is.
 */
export const unwrapBlockParagraph = (html: string): string => {
  const trimmed = html.trim();
  if (!OPENING_P.test(trimmed) || !CLOSING_P.test(trimmed)) return html;

  // Walk the paragraph tags: if depth returns to zero before the end, these are
  // siblings (`<p>a</p><p>b</p>`) rather than one wrapper.
  let depth = 0;
  let match: RegExpExecArray | null;
  P_TAG.lastIndex = 0;
  while ((match = P_TAG.exec(trimmed)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0 && P_TAG.lastIndex < trimmed.length) return html;
  }
  if (depth !== 0) return html;

  const inner = trimmed.replace(OPENING_P, "").replace(CLOSING_P, "");
  return BLOCK_LEVEL.test(inner) ? inner : html;
};

const ParagraphBlock = (props: ChaiBlockComponentProps<ParagraphProps>) => {
  const { blockProps, styles, content } = props;
  const hasChildren = !isNull(props.children);
  // Hooks stay unconditional, but the unwrap only runs when the innerHTML path is
  // taken and only when `content` changes (not on every selection-driven re-render).
  const html = React.useMemo(() => (hasChildren ? "" : unwrapBlockParagraph(content ?? "")), [content, hasChildren]);
  const innerHtml = useInnerHtml(html);

  if (hasChildren) return React.createElement("p", { ...styles, ...blockProps }, props.children);

  const forcedStyles = addForcedClasses(styles, "rte typeset");

  return React.createElement("div", {
    ...forcedStyles,
    ...blockProps,
    dangerouslySetInnerHTML: innerHtml,
  });
};

const Config = {
  type: "Paragraph",
  description: "A paragraph component",
  label: "Paragraph",
  category: "core",
  icon: TextIcon,
  group: "typography",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      content: {
        type: "string",
        title: "Content",
        default: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat. Aenean faucibus nibh et justo cursus id rutrum lorem imperdiet. Nunc ut sem vitae risus tristique posuere.`,
        ui: { "ui:widget": "richtext", "ui:autosize": true, "ui:rows": 5 },
      },
    },
  }),
  i18nProps: ["content"],
  aiProps: ["content"],
  childrenOverrideProps: ["content"],
  canAcceptBlock: (type: string) => type === "Span" || type === "Link" || type === "Text",
};

export { ParagraphBlock as Component, Config };
