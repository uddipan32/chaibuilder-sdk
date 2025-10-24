import { useFrame } from "@/core/frame/frame-context";
import { useBlockHighlight } from "@/core/hooks/use-block-highlight";
import { useInlineEditing } from "@/core/hooks/use-inline-editing";
import { useLanguages } from "@/core/hooks/use-languages";
import { useSelectedBlockIds } from "@/core/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "@/core/hooks/use-update-blocks-props";
import { useRTEditor } from "@/core/rjsf-widgets/rte-widget/use-rte-editor";
import RteMenubar from "@/core/rjsf-widgets/rte-widget/rte-menu-bar";
import { ChaiBlock } from "@/types/chai-block";
import { getRegisteredChaiBlock } from "@chaibuilder/runtime";
import { useDebouncedCallback } from "@react-hookz/web";
import { EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { cloneDeep, get, has } from "lodash-es";
import { createElement, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

function getInitialTextAlign(element: HTMLElement) {
  let el = element;
  while (el) {
    if (el.style && el.style.textAlign) {
      return el.style.textAlign;
    }
    const computed = window.getComputedStyle(el).textAlign;
    if (computed && computed !== "start" && computed !== "initial" && computed !== "inherit") {
      return computed;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * @description This is the editor that is used to edit the block content
 * It is memoized to prevent unnecessary re-renders
 * Editor for : RichText
 */
const RichTextEditor = memo(
  ({
    blockContent,
    editingElement,
    onClose,
    onChange,
    onEscape,
  }: {
    blockContent: string;
    editingElement: HTMLElement;
    onClose: (content: string) => void;
    onChange: (content: string) => void;
    onEscape: (e: KeyboardEvent) => void;
  }) => {
    const { document } = useFrame();

    const editor = useRTEditor({
      value: blockContent,
      blockId: "active-inline-editing-element",
      placeholder: "Enter text here",
      onUpdate: ({ editor }) => onChange(editor?.getHTML() || ""),
      onBlur: ({ editor, event }) => {
        // Only close if clicked outside both editor and bubble menu
        const target = event?.relatedTarget as HTMLElement;
        const editorElement = document.querySelector(".ProseMirror");
        const bubbleMenu = document.querySelector(".tippy-box");
        const menuBar = document.querySelector("#chai-rich-text-menu-bar");

        const isEditorClicked = editorElement?.contains(target);
        const isBubbleMenuClicked = bubbleMenu?.contains(target);
        const isMenuBarClicked = menuBar?.contains(target);
        const isColorPickerOpen = window.document.getElementById("rte-widget-color-picker");

        // Check if click was outside both editor and bubble menu
        if (!isEditorClicked && !isBubbleMenuClicked && !isMenuBarClicked && !isColorPickerOpen) {
          const content = editor?.getHTML() || "";
          onClose(content);
        }
      },
      from: "canvas",
    });

    useEffect(() => {
      // * Setting text alignment
      const textAlign = getInitialTextAlign(editingElement);
      if (textAlign) editor?.commands?.setTextAlign(textAlign);

      editor?.commands?.focus();
      editor?.emit("focus", {
        editor,
        event: new FocusEvent("focus"),
        transaction: [] as any,
      });
    }, [editor]);

    const editorClassName = useMemo(() => {
      const basicClassName = "max-w-none shadow-none outline outline-[2px] outline-green-500 [&_*]:shadow-none";
      if (!editingElement) return basicClassName;

      const editingElementClassName = editingElement?.className?.replace("sr-only", "") || "";
      return `${basicClassName} ${editingElementClassName}`;
    }, [editingElement]);

    const onKeyDown: any = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape(e);
      }
    };

    return (
      editor && (
        <div onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()} className="relative">
          <BubbleMenu
            editor={editor}
            shouldShow={() => editor && editor?.isFocused}
            tippyOptions={{ duration: 100, arrow: true, hideOnClick: false }}
            className="w-max">
            <RteMenubar editor={editor} from="canvas" />
          </BubbleMenu>
          <EditorContent onKeyDown={onKeyDown} value={blockContent} editor={editor} className={editorClassName} />
        </div>
      )
    );
  },
);

/**
 * @description This is the editor that is used to edit the block content
 * It is memoized to prevent unnecessary re-renders
 * Editor for : Heading, Paragraph, Text, Span
 */
const MemoizedEditor = memo(
  ({
    editingElement,
    blockContent,
    onClose,
    editorRef,
    onChange,
    onEscape,
  }: {
    editingElement: HTMLElement;
    blockContent: string;
    onClose: () => void;
    editorRef: React.RefObject<HTMLElement>;
    onChange: (content: string) => void;
    onEscape: (e: KeyboardEvent) => void;
  }) => {
    const { document, window } = useFrame();

    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = blockContent;
        editorRef.current.focus();

        // Move cursor to the end of the text content
        const range = document.createRange();
        const selection = window.getSelection();

        // Move cursor to the end of the text content
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // This collapses the range to the end point

        // Apply the selection
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Force focus and cursor position
        editorRef.current.focus();
      } else {
        onClose();
      }
    }, [document, window]);

    const elementTag = useMemo(() => {
      const tag = editingElement?.tagName?.toLowerCase() || "div";
      return tag === "button" ? "div" : tag;
    }, [editingElement]);

    const onKeyDown = useCallback(
      (e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          onEscape(e);
        }
      },
      [onEscape],
    );

    const onBlur = useCallback(() => {
      onClose();
    }, [onClose]);

    const memoizedProps = useMemo(() => {
      return {
        id: "active-inline-editing-element",
        contentEditable: true,
        className: `${editingElement?.className?.replace("sr-only", "") || ""} outline outline-[2px] outline-green-500 shadow-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:absolute empty:before:pointer-events-none empty:before:select-none empty:before:inset-0 empty:before:z-0 relative min-h-[1em]`,
        style: (cloneDeep(editingElement?.style) || {}) as any,
        onInput: (e) => {
          const element = e.target as HTMLElement;
          if (!element) return;
          if (element.innerText.trim() === "") {
            element.setAttribute("data-placeholder", "Enter text here");
            if (element.children.length > 0) {
              element.children[0].remove();
            }
          } else {
            e.target.removeAttribute("data-placeholder");
          }

          onChange(e.target.innerText);
        },
        onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
        },
      };
    }, [editingElement?.className, editingElement?.style]);

    return (
      <>
        {createElement(elementTag, {
          ref: editorRef,
          onBlur: onBlur,
          onKeyDown: onKeyDown,
          ...memoizedProps,
        })}
      </>
    );
  },
);

/**
 * @description This is the component that is used to edit the block content
 * This is wrapper around the editor component
 */
const WithBlockTextEditor = memo(
  ({ block, children }: { block: ChaiBlock; children: React.ReactNode }) => {
    const editingKey = "content";
    const { document } = useFrame();
    const { editingBlockId, editingItemIndex, setEditingBlockId, setEditingItemIndex } = useInlineEditing();
    const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
    const editorRef = useRef<HTMLElement | null>(null);
    const { clearHighlight } = useBlockHighlight();
    const updateContent = useUpdateBlocksProps();
    const { selectedLang } = useLanguages();
    const [, setIds] = useSelectedBlockIds();
    const currentBlockId = useRef(null);
    const blockId = editingBlockId;

    // * Memoize the block content and type
    const { blockContent, blockType } = useMemo(() => {
      const blockType = block._type;
      let blockContent = block[editingKey];
      const registeredBlock = getRegisteredChaiBlock(block._type);
      const isI18n = selectedLang && registeredBlock?.i18nProps?.includes(editingKey);
      if (isI18n && has(block, `${editingKey}-${selectedLang}`)) {
        blockContent = get(block, `${editingKey}-${selectedLang}`);
      }

      return { blockContent, blockType };
    }, [block, selectedLang]);

    // * Handle close
    const handleClose = useCallback(
      (updatedContent?: string) => {
        const content = updatedContent || editorRef.current?.innerText;
        updateContent([blockId], { [editingKey]: content });
        setEditingElement(null);
        setEditingBlockId(null);
        setEditingItemIndex(-1);
        setIds([]);
        if (blockId) setTimeout(() => setIds([blockId]), 100);
      },
      [blockId, updateContent, setEditingBlockId, setIds, selectedLang],
    );

    // * Handle change on 1000ms debounce
    const handleChange = useDebouncedCallback(
      (content: string) => {
        updateContent([blockId], { [editingKey]: content });
      },
      [blockId, block, updateContent, selectedLang],
      1000,
    );

    // * Handle escape key
    const handleEscape = useCallback(
      (e) => {
        e.preventDefault();
        if (blockId) currentBlockId.current = blockId;

        handleClose();
        setTimeout(() => {
          const _blockId = currentBlockId.current;
          currentBlockId.current = null;
          setIds([_blockId]);
        }, 100);
      },
      [setIds, blockId, selectedLang],
    );

    // * Set the editing element
    useEffect(() => {
      if (!blockId) return;

      // * Get the editing element
      const query1 = `[data-block-id="${blockId}"]`;
      const query2 = editingItemIndex >= 0 ? `[data-block-index="${editingItemIndex}"]` : "";
      const element = document.querySelector(`${query1}${query2}`) as HTMLElement;
      if (!element) return;

      // * Add the sr-only class to the element
      element?.classList?.add("sr-only");
      setEditingElement(element);
    }, [blockId, blockType, document, editingItemIndex]);

    const memoizedEditor = useMemo(() => {
      if (!editingElement) return null;
      clearHighlight();

      if (["RichText", "Paragraph"].includes(blockType)) {
        return (
          <RichTextEditor
            blockContent={blockContent}
            editingElement={editingElement}
            onChange={handleChange}
            onClose={handleClose}
            onEscape={handleEscape}
          />
        );
      }

      return (
        <MemoizedEditor
          editorRef={editorRef}
          blockContent={blockContent}
          editingElement={editingElement}
          onClose={handleClose}
          onChange={handleChange}
          onEscape={handleEscape}
        />
      );
    }, [editingElement, blockId, blockType, blockContent, handleClose, selectedLang]);

    return (
      <>
        {memoizedEditor}
        {children}
      </>
    );
  },
  (prevProps, nextProps) => {
    // * Custom comparison function for memo
    return prevProps.block._id === nextProps.block._id && prevProps.block.content === nextProps.block.content;
  },
);

export default WithBlockTextEditor;
