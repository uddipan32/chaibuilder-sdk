import { IdCardIcon, LoopIcon } from "@radix-ui/react-icons";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { mergeAttributes, Node, nodeInputRule, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { Editor, NodeViewProps } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { parseBindingExpression } from "~/render/binding-pipes";
import { BINDING_NODE_NAME } from "./binding-doc";
import { BindingPipelineEditor } from "./binding-pipeline-editor";

// A complete binding occurrence inside a text node: `{{ ... }}` with no nested braces.
const TOKENIZER_REGEX = /\{\{([^{}]+)\}\}/g;

const truncate = (text: string, max = 24): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

type BindingNodeOptions = { getData: () => Record<string, any>; locale: string };

const BindingBadge = ({ node, selected, updateAttributes, deleteNode, extension }: NodeViewProps) => {
  const expression: string = node.attrs.expression ?? "";
  const parsed = parseBindingExpression(expression);
  const invalid = parsed.kind === "invalid";
  const isRepeater = expression.startsWith("$index");
  const isCollection = expression.startsWith("#");
  const options = extension.options as BindingNodeOptions;

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={invalid ? parsed.reason : expression}
            contentEditable={false}
            className={cn(
              "inline-flex items-center gap-1 rounded align-middle text-[11px] leading-tight select-none",
              invalid ? "text-destructive" : "text-orange",
              selected && "ring-ring ring-2",
            )}>
            {isRepeater ? (
              <LoopIcon className="h-2.5 w-2.5 shrink-0" />
            ) : isCollection ? (
              <IdCardIcon className="h-2.5 w-2.5 shrink-0" />
            ) : null}
            <span>{`{{${truncate(expression)}}}`}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80" contentEditable={false}>
          <BindingPipelineEditor
            expression={expression}
            externalData={options.getData()}
            locale={options.locale}
            onChange={(nextExpression) => updateAttributes({ expression: nextExpression })}
            onRemove={deleteNode}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
};

type BindingMatch = { from: number; to: number; expression: string };

const collectBindingMatches = (doc: PMNode): BindingMatch[] => {
  const matches: BindingMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    TOKENIZER_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOKENIZER_REGEX.exec(node.text)) !== null) {
      matches.push({
        from: pos + match.index,
        to: pos + match.index + match[0].length,
        expression: match[1].trim(),
      });
    }
  });
  return matches;
};

const bindingTokenizerPlugin = (nodeName: string) =>
  new Plugin({
    key: new PluginKey("chaiBindingTokenizer"),
    appendTransaction: (transactions, _oldState, newState) => {
      if (!transactions.some((tr) => tr.docChanged)) return null;

      const matches = collectBindingMatches(newState.doc);
      if (!matches.length) return null;

      const tr = newState.tr;
      const bindingType = newState.schema.nodes[nodeName];
      // Replace from last to first so earlier positions stay valid.
      for (let i = matches.length - 1; i >= 0; i--) {
        const { from, to, expression } = matches[i];
        tr.replaceWith(from, to, bindingType.create({ expression }));
      }
      // The replacements remove the raw `{{...}}` text, so this does not re-trigger.
      return tr.steps.length ? tr : null;
    },
  });

/**
 * Tokenizes any literal `{{...}}` text currently in the editor into badge nodes. Needed
 * for RTE, which loads raw HTML strings whose bindings live as plain text (the tokenizer
 * plugin only fires on subsequent doc changes, not on initial content).
 */
export const tokenizeBindings = (editor: Editor) => {
  const matches = collectBindingMatches(editor.state.doc);
  if (!matches.length) return;
  const tr = editor.state.tr;
  const bindingType = editor.state.schema.nodes[BINDING_NODE_NAME];
  if (!bindingType) return;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { from, to, expression } = matches[i];
    tr.replaceWith(from, to, bindingType.create({ expression }));
  }
  if (tr.steps.length) editor.view.dispatch(tr);
};

export const ChaiBindingNode = Node.create<BindingNodeOptions>({
  name: BINDING_NODE_NAME,
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { getData: () => ({}), locale: "en" };
  },

  addAttributes() {
    return {
      expression: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-chai-binding") ?? "",
        renderHTML: (attributes) => ({ "data-chai-binding": attributes.expression }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-chai-binding]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), `{{${node.attrs.expression}}}`];
  },

  renderText({ node }) {
    return `{{${node.attrs.expression}}}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(BindingBadge);
  },

  addCommands() {
    return {
      insertChaiBinding:
        (expression: string) =>
        ({ commands }: any) =>
          commands.insertContent({ type: BINDING_NODE_NAME, attrs: { expression: expression.trim() } }),
    } as any;
  },

  // Fires the instant the user types the closing `}}`, turning `{{ expr }}` into a badge.
  // This is the reliable commit path for free-form expressions typed inline (the
  // appendTransaction tokenizer below is the fallback for paste / programmatic inserts).
  addInputRules() {
    return [
      nodeInputRule({
        find: /\{\{([^{}]+)\}\}$/,
        type: this.type,
        getAttributes: (match) => ({ expression: (match[1] ?? "").trim() }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [bindingTokenizerPlugin(this.name)];
  },
});
