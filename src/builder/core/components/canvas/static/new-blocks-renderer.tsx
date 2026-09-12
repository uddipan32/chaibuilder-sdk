import { atom, Atom, Provider, useAtom, useAtomValue } from "jotai";
import { splitAtom } from "jotai/utils";
import { get, isArray, isEmpty, isNull, isString, noop } from "lodash-es";
import React, { createContext, createElement, memo, Suspense, useCallback, useContext, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { blockChildrenMapAtom, pageBlocksAtomsAtom } from "~/builder/atoms/blocks";
import { usePageExternalData } from "~/builder/atoms/builder";
import { builderStore } from "~/builder/atoms/store";
import { dataBindingActiveAtom } from "~/builder/atoms/ui";
import { useIsDragAndDropEnabled } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks";
import { useDirectBlockDrag } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-direct-block-drag";
import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "~/builder/core/components/canvas/static/new-blocks-render-helpers";
import { getRuntimePropsAtom } from "~/builder/core/components/canvas/static/runtime-props-atom";
import { useDesignTokens } from "~/builder/core/design-tokens/use-design-tokens";
import {
  buildBlockChildrenMap,
  ChaiBlockChildrenMap,
  ChaiBlockStructureEntry,
} from "~/builder/core/functions/blocks-fn";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useEditorMode } from "~/builder/hooks/use-editor-mode";
import { useInlineEditing } from "~/builder/hooks/use-inline-editing";
import { useLanguages } from "~/builder/hooks/use-languages";
import { partialBlocksListAtom, usePartialBlocksStore } from "~/builder/hooks/use-partial-blocks-store";
import { useSavePage } from "~/builder/hooks/use-save-page";
import { useGetBlockAtom } from "~/builder/hooks/use-update-block-atom";
import { MAX_PARTIAL_DEPTH } from "~/constants/PARTIAL_BLOCKS";
import { getRegisteredChaiBlock, resolveChaiBlockComponent } from "~/registry";
import { applyBindingToBlockProps } from "~/render/apply-binding";
import { resolveBindingVisibility } from "~/render/binding-engine";
import { mergeDesignTokens } from "~/render/resolve-design-token";
import { ChaiBlock } from "~/types/common";
import { adjustSpacingInBlock } from "./adjust-spacing-in-blocks";
import { MayBeAsyncPropsWrapper } from "./async-props-wrapper";
import { ErrorFallback } from "./error-fallback";
import WithBlockTextEditor from "./with-block-text-editor";

export const RepeaterContext = createContext<{
  index: number;
  key: string;
}>({
  index: -1,
  key: "",
});

// Separate slot from RepeaterContext on purpose: a Repeater inside a
// CollectionItem re-provides RepeaterContext per item and must not clobber
// `$item`, and vice versa. `itemKey` is the resolved flat data path of the
// found item (e.g. `#agents/<blockId>.0`), empty when nothing resolved.
export const CollectionItemContext = createContext<{ itemKey: string }>({ itemKey: "" });

export const PartialDepthContext = createContext<number>(0);
export const BuilderRenderContext = createContext<{
  inPartialBlock: boolean;
}>({
  inPartialBlock: false,
});

const IN_PARTIAL_BLOCK_CONTEXT = { inPartialBlock: true };

/**
 * Structure of the block tree currently being rendered (page or partial block).
 * Only changes identity on structural changes — never on prop-only edits — so
 * prop updates re-render just the affected block's subtree.
 */
type BlocksStructure = {
  childrenMap: ChaiBlockChildrenMap;
  getBlockAtom: (idOrAtom: Atom<ChaiBlock> | string) => Atom<ChaiBlock> | null;
};

const BlocksStructureContext = createContext<BlocksStructure | null>(null);

const EMPTY_CHILDREN: ChaiBlockStructureEntry[] = [];

const INLINE_CONTENT_PARENT_TYPES = ["Heading", "Paragraph", "Link"];

const CORE_BLOCKS = [
  "Box",
  "Repeater",
  "CollectionItem",
  "GlobalBlock",
  "PartialBlock",
  "Heading",
  "Text",
  "RichText",
  "Span",
  "Image",
  "Button",
  "Paragraph",
  "Link",
  "Video",
  "Audio",
  "Icon",
  "List",
  "ListItem",
  "CustomScript",
  "CustomHTML",
];

const BlockRenderer = ({
  asyncProps,
  block,
  children,
}: {
  block: ChaiBlock;
  asyncProps: Record<string, any>;
  children: ({
    _id,
    _type,
    $repeaterItemsKey,
    repeaterItems,
    partialBlockId,
  }: {
    _id: string;
    _type: string;
    $repeaterItemsKey?: string;
    repeaterItems?: any;
    partialBlockId?: string;
  }) => React.ReactNode;
}) => {
  const { editingBlockId, editingItemIndex } = useInlineEditing();
  const registeredChaiBlock = useMemo(() => getRegisteredChaiBlock(block._type) as any, [block._type]);
  const { selectedLang, fallbackLang } = useLanguages();
  const pageExternalData = usePageExternalData();
  const [dataBindingActive] = useAtom(dataBindingActiveAtom);
  const Component = resolveChaiBlockComponent(registeredChaiBlock, block._variant);
  const { index, key } = useContext(RepeaterContext);
  const { itemKey } = useContext(CollectionItemContext);
  const { mode } = useEditorMode();
  const designTokens = useDesignTokens();
  const { inPartialBlock } = useContext(BuilderRenderContext);

  // Enable direct drag-and-drop for blocks in edit mode
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
  const isEditMode = mode === "edit";
  const {
    onMouseDown: onDirectDragMouseDown,
    onDragStart: onDirectDragStart,
    onDragEnd: onDirectDragEnd,
  } = useDirectBlockDrag();

  const dataBindingProps = useMemo(
    () =>
      dataBindingActive
        ? applyBindingToBlockProps(applyLanguage(block, selectedLang, registeredChaiBlock), pageExternalData, {
            index,
            key,
            locale: selectedLang || fallbackLang || "en",
            itemKey,
          })
        : applyLanguage(block, selectedLang, registeredChaiBlock),
    [block, selectedLang, fallbackLang, registeredChaiBlock, pageExternalData, dataBindingActive, index, key, itemKey],
  );

  const blockAttributesProps = useMemo(() => getBlockTagAttributes(block, true, designTokens), [block, designTokens]);
  const mergedDesignTokens = useMemo(() => mergeDesignTokens(designTokens), [designTokens]);

  // Only subscribe to presentBlocksAtom if block has runtime props
  const runtimePropsAtom = useMemo(
    () => getRuntimePropsAtom(block._id, getBlockRuntimeProps(block._type)),
    [block._id, block._type],
  );
  const [runtimeProps] = useAtom(runtimePropsAtom);

  // Prepare blockProps with drag handlers if DnD is enabled
  const blockProps = useMemo(() => {
    const baseProps: Record<string, any> = {
      "data-block-id": block._id,
      "data-block-type": block._type,
      "data-block-index": index,
    };

    // Surface the referenced partial/global page id on the DOM so structure
    // validation errors raised on inner blocks can navigate back into the
    // partial/global block via gotoPage (data-block-id is only the instance id).
    if (block._type === "PartialBlock" || block._type === "GlobalBlock") {
      const referencedPageId = get(block, "partialBlockId", get(block, "globalBlock", ""));
      if (referencedPageId) {
        baseProps["data-partial-block-id"] = referencedPageId;
      }
    }

    // Add drag handlers if DnD is enabled in edit mode
    if (isEditMode && isDragAndDropEnabled) {
      const propsWithDrag = {
        ...baseProps,
        draggable: !editingBlockId,
        onMouseDown: onDirectDragMouseDown,
        onDragStart: onDirectDragStart,
        onDragEnd: onDirectDragEnd,
      };
      return propsWithDrag;
    }

    return baseProps;
  }, [
    block._id,
    block._type,
    block.partialBlockId,
    block.globalBlock,
    index,
    isEditMode,
    isDragAndDropEnabled,
    onDirectDragMouseDown,
    onDirectDragStart,
    onDirectDragEnd,
    editingBlockId,
  ]);

  const props = useMemo(
    () => ({
      blockProps,
      inBuilder: mode === "edit",
      inPartialBlock,
      lang: selectedLang || fallbackLang,
      pageData: pageExternalData,
      designTokens: mergedDesignTokens,
      ...dataBindingProps,
      ...blockAttributesProps,
      ...runtimeProps,
      ...asyncProps,
    }),
    [
      blockProps,
      mode,
      selectedLang,
      inPartialBlock,
      fallbackLang,
      pageExternalData,
      mergedDesignTokens,
      dataBindingProps,
      blockAttributesProps,
      runtimeProps,
      asyncProps,
    ],
  );
  const needErrorBoundary = useMemo(() => !CORE_BLOCKS.includes(block._type), [block._type]);
  const isShown = useMemo(() => {
    const show = get(block, "_show", true);
    if (isString(show) && !dataBindingActive) return true;
    return resolveBindingVisibility(show, pageExternalData, {
      index,
      repeaterKey: key,
      itemKey,
      locale: selectedLang || fallbackLang || "en",
    });
  }, [block, dataBindingActive, fallbackLang, index, key, itemKey, pageExternalData, selectedLang]);
  if (isNull(Component) || !isShown) return null;
  const blockNode = (
    <Suspense>
      {createElement(
        Component,
        props,
        children({
          _id: block._id,
          _type: block._type,
          ...(isArray(dataBindingProps.repeaterItems)
            ? {
                repeaterItems: applyLimit(dataBindingProps.repeaterItems, block),
                $repeaterItemsKey: dataBindingProps.$repeaterItemsKey,
              }
            : {}),
          ...(block.partialBlockId ? { partialBlockId: block.partialBlockId } : ""),
          ...(block.globalBlock ? { partialBlockId: block.globalBlock } : ""),
        }),
      )}
    </Suspense>
  );

  const blockNodeWithTextEditor =
    editingBlockId === block._id && (editingItemIndex === index || index < 0) ? (
      <WithBlockTextEditor block={block}>{blockNode}</WithBlockTextEditor>
    ) : (
      blockNode
    );

  return needErrorBoundary ? (
    <ErrorBoundary fallbackRender={ErrorFallback}>{blockNodeWithTextEditor}</ErrorBoundary>
  ) : (
    blockNodeWithTextEditor
  );
};

const PartialWrapper = ({ children, partialBlockId }: { children: React.ReactNode; partialBlockId: string }) => {
  const gotoPage = useBuilderProp("gotoPage", noop);
  const { saveState, savePageAsync } = useSavePage();
  const { selectedLang, fallbackLang } = useLanguages();
  const partialBlocksList = useAtomValue(partialBlocksListAtom);
  const partialName = get(partialBlocksList, [partialBlockId, "name"], "");
  const onDoubleClick = useCallback(
    async (e: any) => {
      e.stopPropagation();
      // Navigating into a partial/global requires the current page to be
      // persisted first, otherwise the destination loads stale blocks.
      if (saveState === "SAVING") {
        return;
      }
      if (saveState === "UNSAVED") {
        try {
          await savePageAsync();
        } catch (error) {
          console.error("Failed to save page before opening partial block", error);
          toast.error("Could not save the page. Please try again.");
          return;
        }
      }
      gotoPage({ pageId: partialBlockId, lang: selectedLang || fallbackLang });
    },
    [saveState, savePageAsync, gotoPage, partialBlockId, selectedLang, fallbackLang],
  );
  return (
    <>
      {children}
      <div className="partial-overlay group absolute inset-0 z-50">
        <div
          onDoubleClick={onDoubleClick}
          className="bg-background/10 flex h-full w-full items-center justify-center opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100 group-hover:backdrop-opacity-85">
          <p className="rounded-md bg-white px-2 py-1 text-xs">
            {partialName
              ? `${partialName} — Partial block. Double click to edit.`
              : "Partial block. Double click to edit."}
          </p>
        </div>
      </div>
    </>
  );
};

const PartialDepthExceededPlaceholder = () => (
  <div className="border-destructive bg-destructive/10 text-destructive flex items-center justify-center rounded-md border p-4 text-center text-sm">
    <p>Maximum partial nesting depth ({MAX_PARTIAL_DEPTH} levels) exceeded</p>
  </div>
);

const PartialBlocksRenderer = ({ partialBlockId }: { partialBlockId: string }) => {
  const { getPartialBlocks } = usePartialBlocksStore();
  const currentDepth = useContext(PartialDepthContext);
  const partialBlocks = useMemo(() => getPartialBlocks(partialBlockId), [getPartialBlocks, partialBlockId]);
  const partialBlocksAtoms = useMemo(() => splitAtom(atom(partialBlocks)), [partialBlocks]);
  const getBlockAtom = useGetBlockAtom(partialBlocksAtoms);
  const structure = useMemo(
    () => ({ childrenMap: buildBlockChildrenMap(partialBlocks ?? []), getBlockAtom }),
    [partialBlocks, getBlockAtom],
  );

  // Check if max depth exceeded
  if (currentDepth >= MAX_PARTIAL_DEPTH) {
    return <PartialDepthExceededPlaceholder />;
  }

  if (isEmpty(partialBlocks)) return null;
  return (
    <PartialDepthContext.Provider value={currentDepth + 1}>
      <BuilderRenderContext.Provider value={IN_PARTIAL_BLOCK_CONTEXT}>
        <PartialWrapper partialBlockId={partialBlockId}>
          <BlocksStructureContext.Provider value={structure}>
            <BlocksRenderer type="PartialBlock" />
          </BlocksStructureContext.Provider>
        </PartialWrapper>
      </BuilderRenderContext.Provider>
    </PartialDepthContext.Provider>
  );
};

/**
 * Renders one block (subscribing only to its own atom) and decides how to
 * recurse into its children. Memoized so structural re-renders of the parent
 * list don't cascade into unchanged subtrees.
 */
const BlockSubtree = memo(({ id, contentSpacing }: { id: string; contentSpacing?: "trail" | "trim" }) => {
  const structure = useContext(BlocksStructureContext);
  const blockAtom = structure?.getBlockAtom(id) ?? null;
  if (!blockAtom) return null;
  return <BlockSubtreeInner blockAtom={blockAtom} contentSpacing={contentSpacing} />;
});
BlockSubtree.displayName = "BlockSubtree";

const BlockSubtreeInner = ({
  blockAtom,
  contentSpacing,
}: {
  blockAtom: Atom<ChaiBlock>;
  contentSpacing?: "trail" | "trim";
}) => {
  const structure = useContext(BlocksStructureContext);
  const [rawBlock] = useAtom(blockAtom);
  const block = useMemo(
    () => (contentSpacing ? adjustSpacingInBlock(rawBlock, contentSpacing === "trail") : rawBlock),
    [rawBlock, contentSpacing],
  );
  const hasChildren = structure?.childrenMap.has(block._id) ?? false;
  return (
    <MayBeAsyncPropsWrapper block={block}>
      {(asyncProps) => (
        <BlockRenderer block={block} asyncProps={asyncProps}>
          {({ _id, _type, partialBlockId, repeaterItems, $repeaterItemsKey }) => {
            return _type === "Repeater" ? (
              // Check the builder-only preview toggle BEFORE the array guard:
              // when data-binding preview is off, `repeaterItems` is the raw
              // binding string (not an array), so gating on isArray() first
              // would swallow the toggle and leave the empty state unpreviewable.
              block.showEmptyState === true || (isArray(repeaterItems) && repeaterItems.length === 0) ? (
                <BlocksRenderer parent={_id} type={_type} repeaterSlot="emptyState" />
              ) : isArray(repeaterItems) ? (
                repeaterItems.map((_, index) => (
                  <RepeaterContext.Provider key={`${_id}-${index}`} value={{ index, key: $repeaterItemsKey! }}>
                    <BlocksRenderer parent={_id} type={_type} repeaterSlot="items" />
                  </RepeaterContext.Provider>
                ))
              ) : null
            ) : _type === "CollectionItem" ? (
              // Children always render so the canvas stays editable; itemKey is
              // set only when the find resolved an item (binding preview on).
              <CollectionItemContext.Provider
                value={{
                  itemKey:
                    isArray(repeaterItems) && repeaterItems.length > 0
                      ? `${$repeaterItemsKey!.slice(2, -2).trim()}.0`
                      : "",
                }}>
                <BlocksRenderer parent={_id} type={_type} />
              </CollectionItemContext.Provider>
            ) : _type === "GlobalBlock" || _type === "PartialBlock" ? (
              <Provider store={builderStore}>
                <PartialBlocksRenderer partialBlockId={partialBlockId!} />
              </Provider>
            ) : hasChildren ? (
              <BlocksRenderer parent={_id} type={_type} />
            ) : null;
          }}
        </BlockRenderer>
      )}
    </MayBeAsyncPropsWrapper>
  );
};

const BlocksRenderer = ({
  parent = null,
  type = "",
  repeaterSlot,
}: {
  parent?: string | null;
  type?: string;
  repeaterSlot?: "emptyState" | "items";
}) => {
  const structure = useContext(BlocksStructureContext);
  const allChildBlocks = structure?.childrenMap.get(parent || null) ?? EMPTY_CHILDREN;
  // A Repeater splits its children into two slots: the per-row "items" slot
  // (everything except the Empty State) and the "emptyState" slot (only the
  // RepeaterEmptyState child). Non-repeater parents pass no slot → render all.
  const childBlocks = useMemo(() => {
    if (repeaterSlot === "emptyState") return allChildBlocks.filter((c) => c._type === "RepeaterEmptyState");
    if (repeaterSlot === "items") return allChildBlocks.filter((c) => c._type !== "RepeaterEmptyState");
    return allChildBlocks;
  }, [allChildBlocks, repeaterSlot]);
  const adjustContentSpacing = INLINE_CONTENT_PARENT_TYPES.includes(type);
  return (
    <>
      {childBlocks.map((child, index) => (
        <BlockSubtree
          key={child._id}
          id={child._id}
          contentSpacing={adjustContentSpacing ? (index === childBlocks.length - 1 ? "trim" : "trail") : undefined}
        />
      ))}
    </>
  );
};

export const PageBlocksRenderer = () => {
  const childrenMap = useAtomValue(blockChildrenMapAtom);
  const getBlockAtom = useGetBlockAtom(pageBlocksAtomsAtom);
  const structure = useMemo(() => ({ childrenMap, getBlockAtom }), [childrenMap, getBlockAtom]);
  return (
    <BlocksStructureContext.Provider value={structure}>
      <BlocksRenderer />
    </BlocksStructureContext.Provider>
  );
};
