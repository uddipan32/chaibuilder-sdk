import { useDebouncedCallback } from "@react-hookz/web";
import { cloneDeep, get, has } from "lodash-es";
import { createElement, lazy, memo, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "~/builder/core/frame/frame-context";
import { useBlockHighlight } from "~/builder/hooks/use-block-highlight";
import { useInlineEditing } from "~/builder/hooks/use-inline-editing";
import { useLanguages } from "~/builder/hooks/use-languages";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useUpdateBlocksProps, useUpdateBlocksPropsRealtime } from "~/builder/hooks/use-update-blocks-props";
import { getRegisteredChaiBlock } from "~/registry";
import { ChaiBlock } from "~/types/common";

// Deferred: only RichText/Paragraph blocks use the tiptap editor, and only once the
// user actually starts inline-editing one. Keeping it out of the static graph keeps
// tiptap/prosemirror off the canvas's initial render path.
const RichTextEditor = lazy(() => import("~/builder/core/components/canvas/static/rich-text-editor"));


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
      if (!document || !window) return;
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
      // Mount-only on purpose: the contenteditable is uncontrolled while editing.
      // Re-running on blockContent (as it changes from our own debounced commits)
      // would reset innerHTML to stale text mid-typing and jump the cursor.
    }, []);

    const elementTag = useMemo(() => {
      const tag = editingElement?.tagName?.toLowerCase() || "div";
      return tag === "button" ? "div" : tag;
    }, [editingElement]);

    const onKeyDown = useCallback(
      (e: KeyboardEvent) => {
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
        onInput: (e: any) => {
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
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        },
      };
    }, [editingElement?.className, editingElement?.style, onChange]);

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
MemoizedEditor.displayName = "MemoizedEditor";

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
    const updateContentRealtime = useUpdateBlocksPropsRealtime();
    const { selectedLang } = useLanguages();
    const [, setIds] = useSelectedBlockIds();
    const currentBlockId = useRef<string | null>(null);
    const blockId = editingBlockId;

    // * Memoize the block content and type
    const { blockContent, blockType, contentKey } = useMemo(() => {
      const blockType = block._type;
      let blockContent = block[editingKey];
      const registeredBlock = getRegisteredChaiBlock(block._type);
      const isI18n = selectedLang && registeredBlock?.i18nProps?.includes(editingKey);
      // The key the update actually writes to (updatePropsForLanguage remaps i18n props)
      const contentKey = isI18n ? `${editingKey}-${selectedLang}` : editingKey;
      if (isI18n && has(block, contentKey)) {
        blockContent = get(block, contentKey);
      }

      return { blockContent, blockType, contentKey };
    }, [block, selectedLang]);

    // Content as it was when this editing session started — the single undo
    // step for the whole session restores this value.
    const initialContentRef = useRef(blockContent);
    const closedRef = useRef(false);
    useEffect(() => {
      // Only when a session STARTS. Close sets editingBlockId to "" and this
      // effect re-runs — re-arming closedRef here would let the trailing native
      // blur commit a second history entry after Enter/Escape already closed.
      if (!blockId) return;
      initialContentRef.current = blockContent;
      closedRef.current = false;
      // Deps intentionally omit blockContent — it changes on every debounced
      // runtime commit
    }, [blockId]);

    // * Handle close: commit ONE undoable history entry for the whole editing
    // session (undo restores the pre-edit content). Intermediate typing goes
    // through the runtime (history-less) path below.
    const handleClose = useCallback(
      (updatedContent?: string) => {
        // Guard: Enter/Escape close is followed by the contenteditable's blur
        // event — without this, the session would commit twice (two history entries)
        if (closedRef.current || !blockId) return;
        closedRef.current = true;
        const content = updatedContent ?? editorRef.current?.innerText;
        if (content !== undefined && content !== initialContentRef.current) {
          updateContent([blockId], { [editingKey]: content }, { [contentKey]: initialContentRef.current });
        } else if (content !== undefined) {
          // Unchanged vs session start, but intermediate runtime commits may have
          // landed — sync the block back without polluting history
          updateContentRealtime([blockId], { [editingKey]: content });
        }
        setEditingElement(null);
        setEditingBlockId("");
        setEditingItemIndex(-1);
        setIds([]);
        if (blockId) setTimeout(() => setIds([blockId]), 100);
      },
      [updateContent, updateContentRealtime, blockId, contentKey, setEditingBlockId, setEditingItemIndex, setIds],
    );

    // * Handle change on 1000ms debounce — runtime update only (no history
    // entry per keystroke/pause); the undoable commit happens once on close.
    // closedRef guard: a pending fire after close would overwrite the committed
    // content — and clobber an undo done within the debounce window.
    const handleChange = useDebouncedCallback(
      (content: string) => {
        if (closedRef.current) return;
        updateContentRealtime([blockId], { [editingKey]: content });
      },
      [blockId, updateContentRealtime],
      1000,
    );

    // * Handle escape key
    const handleEscape = useCallback(
      (e: KeyboardEvent, content?: string) => {
        e.preventDefault();
        if (blockId) currentBlockId.current = blockId;

        handleClose(content);
        setTimeout(() => {
          const _blockId = currentBlockId.current;
          currentBlockId.current = null;
          if (_blockId) {
            setIds([_blockId]);
          }
        }, 100);
      },
      [blockId, handleClose, setIds],
    );

    // * Set the editing element
    useEffect(() => {
      if (!blockId || !document) return;

      // * Get the editing element
      const query1 = `[data-block-id="${blockId}"]`;
      const query2 = editingItemIndex >= 0 ? `[data-block-index="${editingItemIndex}"]` : "";
      const element = document.querySelector(`${query1}${query2}`) as HTMLElement;
      if (!element) return;

      // * Add the sr-only class to the element
      element?.classList?.add("sr-only");
      startTransition(() => setEditingElement(element));
    }, [blockId, blockType, document, editingItemIndex]);

    const memoizedEditor = useMemo(() => {
      if (!editingElement) return null;
      clearHighlight();

      if (["RichText", "Paragraph"].includes(blockType)) {
        return (
          <Suspense fallback={null}>
            <RichTextEditor
              blockContent={blockContent}
              editingElement={editingElement}
              onChange={handleChange}
              onClose={handleClose}
              onEscape={handleEscape}
            />
          </Suspense>
        );
      }

      return (
        <MemoizedEditor
          editorRef={editorRef as any}
          blockContent={blockContent}
          editingElement={editingElement}
          onClose={handleClose}
          onChange={handleChange}
          onEscape={handleEscape}
        />
      );
    }, [editingElement, clearHighlight, blockType, blockContent, handleClose, handleChange, handleEscape]);

    return (
      <>
        {memoizedEditor}
        {children}
      </>
    );
  },
  (prevProps, nextProps) => {
    // * Custom comparison: _id only. This component is mounted only while its
    // block is being inline-edited, and the contenteditable is uncontrolled —
    // re-rendering on content changes (which come from our own debounced runtime
    // commits) would reset the editor to stale text mid-typing.
    return prevProps.block._id === nextProps.block._id;
  },
);
WithBlockTextEditor.displayName = "WithBlockTextEditor";

export default WithBlockTextEditor;
