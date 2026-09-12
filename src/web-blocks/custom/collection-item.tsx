import { Crosshair2Icon } from "@radix-ui/react-icons";
import { isArray } from "lodash-es";
import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiBlockConfig, ChaiStyles } from "~/types/blocks";
import type { ChaiRepeaterFilter } from "~/types/repeater-data";
import EmptySlot from "~/web-blocks/empty-slot";

export type CollectionItemProps = {
  children?: React.ReactNode;
  tag: string;
  styles: ChaiStyles;
  repeaterItems?: any[];
  filters?: ChaiRepeaterFilter[];
};

export const CollectionItem = (props: ChaiBlockComponentProps<CollectionItemProps>) => {
  const { children, tag = "div", styles, blockProps, repeaterItems, filters, inBuilder, $loading } = props;

  if (!inBuilder) {
    // Live site: no source, unresolved source, or an empty find renders nothing.
    if (!isArray(repeaterItems) || repeaterItems.length === 0) return null;
    return React.createElement(tag, { ...blockProps, ...styles }, children);
  }

  if ($loading) {
    return React.createElement(
      tag,
      { ...blockProps, ...styles },
      <div className="animate-pulse rounded-md bg-primary/10 p-5">
        <div className="h-6 w-1/2 rounded-md bg-primary/10"></div>
        <div className="mt-2 h-4 w-1/2 rounded-md bg-primary/10"></div>
      </div>,
    );
  }

  // Builder: children always render so the canvas stays editable even when the
  // find returned nothing; a subtle strip explains why bindings look unresolved.
  // An unresolved prop (no source, fetch error, item never loaded) reads the
  // same as an empty find here — every one of them means "no $item" — so a
  // falsy/non-array value gets the same strip as an empty array.
  const noItemFound = !isArray(repeaterItems) || repeaterItems.length === 0;
  // No filter means no find ran at all — say that instead of blaming the find.
  const hasFind = isArray(filters) && filters.length > 0;
  return React.createElement(
    tag,
    { ...blockProps, ...styles },
    <>
      {noItemFound && (
        <div className="flex items-center justify-center bg-orange-50 p-2 text-sm text-muted-foreground">
          {hasFind
            ? "No item found — the filters matched nothing. Showing layout with unresolved bindings"
            : "Add a filter to find an item. Showing layout with unresolved bindings"}
        </div>
      )}
      {children ?? <EmptySlot inBuilder={inBuilder} />}
    </>,
  );
};

export const CollectionItemConfig: Omit<ChaiBlockConfig, "component"> = {
  type: "CollectionItem",
  label: "Collection Item",
  icon: Crosshair2Icon,
  group: "basic",
  category: "core",
  description:
    "Finds a single item from a data source using filters and exposes it to inner blocks as $item for data binding",
  dataProviderMode: "live",
  dataProviderDependencies: ["repeaterItems", "filters"],
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      // The prop name `repeaterItems` is load-bearing: applyBindingToBlockProps
      // keys its `{{#src}}` -> `{{#src/<blockId>}}` rewrite on this name, and the
      // server fetch pipeline reads the source id from it.
      repeaterItems: {
        title: "Data Source",
        type: "string",
        binding: "array",
        default: "",
        ui: {
          "ui:widget": "repeaterBinding",
          "ui:readonly": true,
        },
      },
      tag: {
        title: "Tag",
        type: "string",
        default: "div",
        enum: ["div", "section", "article"],
      },
      // Structured find query for repeater-data sources. No title/default on
      // purpose — same reasoning as the Repeater's filters prop. No sortBy:
      // the find always takes the source's own default order.
      filters: {
        type: "array",
        items: { type: "object" },
        ui: { "ui:field": "hiddenField" },
      },
    },
  }),
  canAcceptBlock: () => true,
};
