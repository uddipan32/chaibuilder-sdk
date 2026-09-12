import { t } from "i18next";
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { BindingOptionRow } from "~/builder/core/components/binding-popup/binding-option-row";
import { scrollSuggestionIntoView } from "~/builder/core/components/binding-popup/position";
import { cn } from "~/lib/utils";
import type { BindingSuggestionItem } from "./use-binding-suggestion-items";

export { scrollSuggestionIntoView };

export type SuggestionDropdownRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type SuggestionDropdownProps = {
  items: BindingSuggestionItem[];
  command: (item: BindingSuggestionItem) => void;
};

export const SuggestionDropdown = forwardRef<SuggestionDropdownRef, SuggestionDropdownProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSelectedIndex(0), [items]);

    useLayoutEffect(() => {
      const list = listRef.current;
      const selectedItem = list?.children[selectedIndex] as HTMLElement | undefined;
      if (list && selectedItem) scrollSuggestionIntoView(list, selectedItem);
    }, [items, selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="border-border bg-popover text-popover-foreground w-60 overflow-hidden rounded-md border shadow-md">
        <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="text-muted-foreground px-2 py-3 text-center text-xs">{t("No fields found")}</div>
          ) : (
            items.map((item, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                key={item.path}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(index);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs",
                  index === selectedIndex ? "bg-accent text-accent-foreground" : "text-foreground",
                )}>
                <BindingOptionRow
                  label={item.label}
                  icon={item.path.startsWith("$index") ? "repeater" : item.label.startsWith("#") ? "collection" : "field"}
                  preview={item.preview}
                  right={
                    <span className="text-muted-foreground shrink-0 text-[10px]">{item.drillable ? "›" : item.type}</span>
                  }
                />
              </button>
            ))
          )}
        </div>
        <div className="border-border text-muted-foreground border-t px-2 py-1 text-[10px]">
          {t("Type any expression, close with")} <span className="font-mono">{"}}"}</span>
        </div>
      </div>
    );
  },
);

SuggestionDropdown.displayName = "SuggestionDropdown";
