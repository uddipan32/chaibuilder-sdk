import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import { ChaiBindingNode, tokenizeBindings } from "~/builder/core/rjsf-widgets/binding-editor/binding-node";
import { createBindingSuggestionExtension } from "~/builder/core/rjsf-widgets/binding-editor/binding-suggestion";
import type { BindingSuggestionItem } from "~/builder/core/rjsf-widgets/binding-editor/use-binding-suggestion-items";

/**
 *
 * @param blockId
 * @param value
 * @param onUpdate
 * @param onBlur
 * @param placeholder
 * @param from
 * @param style
 * @param getBindingItems - when provided (settings panel), enables `{{` badges + dropdown
 * @returns RTE Editor
 */
export const useRTEditor = ({
  blockId,
  value = "",
  onUpdate = () => {},
  onBlur = () => {},
  placeholder = "",
  from = "settings",
  style = {},
  getBindingItems,
}: {
  blockId: string;
  value: string;
  onUpdate?: (arg: { editor: Editor; event: Event }) => void;
  onBlur: (arg: { editor: Editor; event: FocusEvent }) => void;
  placeholder?: string;
  from?: "settings" | "canvas";
  style?: React.CSSProperties;
  getBindingItems?: (query: string) => BindingSuggestionItem[];
}) => {
  const getItemsRef = React.useRef(getBindingItems);
  getItemsRef.current = getBindingItems;

  const bindingEnabled = from !== "canvas" && !!getBindingItems;

  return useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        Color.configure({
          types: ["textStyle"],
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "underline",
          },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right"],
          defaultAlignment: "left",
        }),
        Underline,
        Placeholder.configure({
          placeholder: placeholder || "Enter text here",
          emptyEditorClass:
            "cursor-text before:content-[attr(data-placeholder)] before:absolute before:opacity-50 before:pointer-events-none",
        }),
        ...(bindingEnabled
          ? [ChaiBindingNode, createBindingSuggestionExtension((query) => getItemsRef.current?.(query) ?? [])]
          : []),
      ],
      content: value || "",
      onCreate: ({ editor }) => {
        if (bindingEnabled) tokenizeBindings(editor as Editor);
      },
      onUpdate: onUpdate as any,
      onBlur: onBlur as any,
      editorProps: {
        attributes: {
          ...((style ? { style } : {}) as any),
          class: from !== "canvas" ? "text-sm p-1 px-2 rte" : "rte",
        },
      },
    },
    // Re-create the editor when binding turns on (page data can arrive after mount) so the
    // binding node/suggestion extensions and initial tokenization are applied.
    [blockId, bindingEnabled],
  );
};
