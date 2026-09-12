import { get, has } from "lodash-es";
import { getRegisteredChaiBlock } from "~/registry";

type BlockDefinition = {
  canAcceptBlock?: (target: string) => boolean;
  canDelete?: () => boolean;
  canDuplicate?: () => boolean;
  canMove?: () => boolean;
  canBeNested?: (target: string) => boolean;
};

export const canAcceptChildBlock = (parentType: string, childType: string) => {
  if (!parentType) return true; // this is root
  const blockDefinition = getRegisteredChaiBlock(parentType) as BlockDefinition;
  if (!blockDefinition) return false;
  return blockDefinition.canAcceptBlock ? blockDefinition.canAcceptBlock(childType) : false; //defaults to false
};

export const canAddChildBlock = (parentType: string) => {
  const blockDefinition = getRegisteredChaiBlock(parentType) as BlockDefinition;
  if (!blockDefinition) return false;
  return has(blockDefinition, "canAcceptBlock"); //defaults to false
};

export const canBeNestedInside = (parentType: string, childType: string) => {
  const blockDefinition = getRegisteredChaiBlock(childType) as BlockDefinition;
  if (!blockDefinition) return true;
  return blockDefinition.canBeNested ? blockDefinition.canBeNested(parentType) : true;
};

export const canDuplicateBlock = (type: string) => {
  const blockDefinition = getRegisteredChaiBlock(type) as BlockDefinition;
  if (!blockDefinition) return true;
  return blockDefinition.canDuplicate ? blockDefinition.canDuplicate() : true;
};

export const canDeleteBlock = (type: string) => {
  const blockDefinition = getRegisteredChaiBlock(type) as BlockDefinition;
  if (!blockDefinition) return true;
  return blockDefinition.canDelete ? blockDefinition.canDelete() : true;
};

export const canDropBlock = (_currentTree: any, { dragSource, dropTarget }: any) => {
  const dragSourceType = get(dragSource, "data._type", "");
  const dropTargetType = get(dropTarget, "data._type", "");
  return canAcceptChildBlock(dropTargetType, dragSourceType);
};

/**
 * A block with no `pageTypes` is available everywhere; otherwise it's
 * restricted to the listed page type keys (e.g. "page", "product").
 */
export const isBlockAvailableForPageType = (block: { pageTypes?: string[] }, pageType: string) => {
  const pageTypes = block?.pageTypes;
  if (!Array.isArray(pageTypes) || pageTypes.length === 0) return true;
  return pageTypes.includes(pageType);
};

if (import.meta.vitest) {
  describe("canDropBlock Function", () => {
    it('should return false if dragSourceType is "Slot"', () => {
      const dragSource = { data: { _type: "Slot" } };
      const dropTarget = { data: {} };
      expect(canDropBlock({}, { dragSource, dropTarget })).toBe(true);
    });

    it("should return true if dropTargetType is empty", () => {
      const dragSource = { data: { _type: "Box" } };
      const dropTarget = { data: {} };
      expect(canDropBlock({}, { dragSource, dropTarget })).toBe(true);
    });
  });

  describe("isBlockAvailableForPageType Function", () => {
    it("should be available on any page type when pageTypes is not set", () => {
      expect(isBlockAvailableForPageType({}, "product")).toBe(true);
      expect(isBlockAvailableForPageType({}, "page")).toBe(true);
    });

    it("should be available on any page type when pageTypes is empty", () => {
      expect(isBlockAvailableForPageType({ pageTypes: [] }, "product")).toBe(true);
    });

    it("should only be available on listed page types", () => {
      expect(isBlockAvailableForPageType({ pageTypes: ["product"] }, "product")).toBe(true);
      expect(isBlockAvailableForPageType({ pageTypes: ["product"] }, "page")).toBe(false);
    });

    it("should support multiple page types", () => {
      expect(isBlockAvailableForPageType({ pageTypes: ["product", "collection"] }, "collection")).toBe(true);
    });
  });
}
