import { forEach, get, isEmpty, map, omit, set } from "lodash-es";
import * as React from "react";
import { useState } from "react";
import AttrsEditor from "~/builder/core/components/settings/new-panel/attributes-editor";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import { useUpdateBlocksProps } from "~/builder/hooks/use-update-blocks-props";
import { ChaiSlot } from "~/builder/register-apis";
import { CHAI_SLOT_IDS } from "~/constants/CHAI_SLOT_IDS";

export const BlockAttributesEditor = React.memo(() => {
  const block = useSelectedBlock();
  const [attributes, setAttributes] = useState([] as Array<{ key: string; value: string }>);
  const [selectedStylingBlock] = useSelectedStylingBlocks();
  const updateBlockProps = useUpdateBlocksProps();

  const attrKey = `${get(selectedStylingBlock, "0.prop")}_attrs`;

  React.useEffect(() => {
    const _attributes = map(omit(get(block, attrKey), ["data-animation"]), (value, key) => ({
      key,
      value,
    }));
    if (!isEmpty(_attributes)) setAttributes(_attributes as any);
    else setAttributes([]);
  }, [get(block, attrKey)]);

  const updateAttributes = React.useCallback(
    (updatedAttributes: any = []) => {
      if (!block) return;
      const _attrs: Record<string, string> = {};
      const existingAnimation = get(block, attrKey, {})["data-animation"];
      if (existingAnimation) {
        _attrs["data-animation"] = existingAnimation;
      }
      forEach(updatedAttributes, (item) => {
        if (!isEmpty(item.key)) {
          set(_attrs, item.key, item.value);
        }
      });
      updateBlockProps([get(block, "_id")], { [attrKey]: _attrs });
    },
    [block, updateBlockProps, attrKey],
  );

  return (
    <>
      <AttrsEditor preloadedAttributes={attributes} onAttributesChange={updateAttributes} />
      <ChaiSlot slotId={CHAI_SLOT_IDS.AFTER_BLOCK_ATTRIBUTES} />
    </>
  );
});

BlockAttributesEditor.displayName = "BlockAttributesEditor";
