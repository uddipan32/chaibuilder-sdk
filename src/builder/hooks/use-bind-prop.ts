import { useCallback } from "react";
import { useUpdateBlocksProps } from "~/builder/hooks/use-update-blocks-props";
import { isValidBindingTemplate } from "~/render/binding-pipes";

/**
 * Sets a data binding on a specific prop of an existing block.
 * The binding value is a {{path.to.data}} string that gets stored in the
 * block's prop and resolved at render time by apply-binding.ts.
 */
export const useBindProp = () => {
  const updateBlocksProps = useUpdateBlocksProps();

  return useCallback(
    (blockId: string, propName: string, bindingPath: string) => {
      const usage = propName === "_show" ? "visibility" : "value";
      if (!isValidBindingTemplate(bindingPath, usage)) {
        console.warn(`[chai] rejected invalid bind_prop pipeline: ${bindingPath}`);
        return false;
      }
      updateBlocksProps([blockId], { [propName]: bindingPath });
      return true;
    },
    [updateBlocksProps],
  );
};
