import { filter, get, has, isArray, map, uniqBy } from "lodash-es";
import { Fragment } from "react";
import { adjustSpacingInContentBlocks } from "~/builder/core/components/canvas/static/adjust-spacing-in-blocks";
import { RenderBlock } from "./block-renderer";
import { getChildBlocks, hasChildBlocks } from "./children-index";
import { RenderChaiBlocksProps } from "./render-chai-blocks-sdk";

const DEFAULT_SLOT_KEY = "";

function resolvePageSlotContent(
  slotName: string,
  slot: RenderChaiBlocksProps["slot"],
  slots: RenderChaiBlocksProps["slots"],
) {
  if (slotName === DEFAULT_SLOT_KEY) return slot ?? null;
  return slots?.[slotName] ?? null;
}

export const RenderBlocks = (
  props: RenderChaiBlocksProps & {
    repeaterData?: { index: number; dataKey: string };
    collectionItemData?: { itemKey: string };
    type?: string;
    repeaterSlot?: "emptyState" | "items";
  },
) => {
  const { blocks, parent, repeaterData, type, slot, slots, slotState, repeaterSlot } = props;
  // Children come from the one-pass parent index (see children-index.ts): the
  // previous full-array filter here plus the full-array `hasChildren` scan per
  // block made assembly O(n²) in page block count. The per-invocation
  // repeaterSlot/_id filtering and uniqBy semantics are unchanged — they now
  // run over the (small) child bucket instead of the whole page.
  let filteredBlocks = uniqBy(
    filter(
      getChildBlocks(blocks, parent),
      (block) =>
        has(block, "_id") &&
        (repeaterSlot !== "emptyState" || block._type === "RepeaterEmptyState") &&
        (repeaterSlot !== "items" || block._type !== "RepeaterEmptyState"),
    ),
    "_id",
  );
  const hasChildren = (blockId: string) => hasChildBlocks(blocks, blockId);

  if (type === "Heading" || type === "Paragraph" || type === "Link" || type === "Span") {
    filteredBlocks = adjustSpacingInContentBlocks(filteredBlocks);
  }

  const rendered = map(filteredBlocks, (block, blockIndex) => {
    if (!block) return null;

    // Inject external React children at PageSlot (before registry lookup).
    if (block._type === "PageSlot") {
      const slotName = String(get(block, "slotName", "") ?? "").trim();
      const key = slotName; // "" = default children slot

      if (slotState?.used.has(key)) {
        console.warn(
          key
            ? `[RenderBlocks] Duplicate PageSlot "${key}"; only the first is used.`
            : "[RenderBlocks] Multiple default PageSlot blocks found; only the first is used.",
        );
        return null;
      }
      slotState?.used.add(key);

      const content = resolvePageSlotContent(key, slot, slots);
      if (content == null) {
        console.warn(
          key
            ? `[RenderBlocks] PageSlot "${key}" found but no matching slots["${key}"] was provided.`
            : "[RenderBlocks] Default PageSlot found but no children/slot content was provided.",
        );
        return null;
      }
      return <Fragment key={block._id ? `${block._id}-${blockIndex}` : `slot-${blockIndex}`}>{content}</Fragment>;
    }

    return (
      <RenderBlock {...props} key={block._id ? `${block._id}-${blockIndex}` : `block-${blockIndex}`} block={block}>
        {({ _id, _type, repeaterItems, $repeaterItemsKey }) => {
          return _type === "Repeater" ? (
            // Empty collection → render the Empty State slot; otherwise render
            // one items pass per row. The RepeaterEmptyState child is filtered
            // out of the items slot (and everything else out of the empty slot)
            // by the repeaterSlot clauses in the block filter above.
            !isArray(repeaterItems) ? null : repeaterItems.length === 0 ? (
              <RenderBlocks
                {...props}
                parent={block._id}
                key={`${get(block, "_parent", "root")}-${block._id}-${blockIndex}-empty`}
                repeaterSlot="emptyState"
              />
            ) : (
              repeaterItems.map((_, index) => (
                <RenderBlocks
                  {...props}
                  parent={block._id}
                  key={`${get(block, "_parent", "root")}-${block._id}-${blockIndex}-${index}`}
                  repeaterData={{ index, dataKey: $repeaterItemsKey! }}
                  repeaterSlot="items"
                />
              ))
            )
          ) : _type === "CollectionItem" ? (
            // Children recurse only when the find resolved an item; `$item`
            // bindings resolve against `<sourceKey>.0`. An outer repeaterData is
            // preserved by the props spread so `$index` still works inside.
            isArray(repeaterItems) &&
            repeaterItems.length > 0 && (
              <RenderBlocks
                {...props}
                parent={block._id}
                key={`${get(block, "_parent", "root")}-${block._id}-${blockIndex}`}
                collectionItemData={{ itemKey: `${$repeaterItemsKey!.slice(2, -2).trim()}.0` }}
                type={block._type}
                repeaterSlot={undefined}
              />
            )
          ) : hasChildren(_id) ? (
            <RenderBlocks
              {...props}
              parent={block._id}
              key={`${get(block, "_parent", "root")}-${block._id}-${blockIndex}`}
              repeaterData={repeaterData}
              type={block._type}
              repeaterSlot={undefined}
            />
          ) : null;
        }}
      </RenderBlock>
    );
  });

  // Root pass: provided content with no matching PageSlot → warn (content dropped).
  if (!parent && slotState) {
    if (slot != null && !slotState.used.has(DEFAULT_SLOT_KEY)) {
      console.warn(
        "[RenderBlocks] children/slot content provided but no default PageSlot found in layout; children dropped.",
      );
    }
    if (slots) {
      for (const name of Object.keys(slots)) {
        if (!slotState.used.has(name)) {
          console.warn(
            `[RenderBlocks] slots["${name}"] provided but no PageSlot with that name found in layout; content dropped.`,
          );
        }
      }
    }
  }

  return rendered;
};
