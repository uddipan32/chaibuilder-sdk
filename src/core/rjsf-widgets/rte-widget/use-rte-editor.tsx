import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";

/**
 *
 * @param blockId
 * @param value
 * @param onUpdate
 * @param onBlur
 * @param placeholder
 * @param from
 * @param style
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
}: {
  blockId: string;
  value: string;
  onUpdate?: (arg: { editor: Editor; event: Event }) => void;
  onBlur: (arg: { editor: Editor; event: FocusEvent }) => void;
  placeholder?: string;
  from?: "settings" | "canvas";
  style?: React.CSSProperties;
}) => {
  return useEditor(
    {
      extensions: [
        StarterKit,
        TextStyle,
        // Color.configure({
        //   types: ["textStyle"],
        // }),
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
      ],
      content: value || "",
      onUpdate: onUpdate as any,
      onBlur: onBlur as any,
      editorProps: {
        attributes: {
          ...((style ? { style } : {}) as any),
          class: from !== "canvas" ? "text-sm p-1 px-2 rte" : "rte",
        },
      },
    },
    [blockId],
  );
};
