import { get, isArray, isObject } from "lodash-es";
import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "~/components/ui/input";
import { BindingOptionRow } from "./binding-option-row";
import { compareBindingFieldNames, getBindingPreview, getBindingTypeLabel } from "./binding-options";
import { positionFixedPopup, scrollSuggestionIntoView } from "./position";

export type BindingSuggestionOption = { path: string; type: string; preview: string };

type SuggestionMeta = {
  start: number;
  end: number;
  options: BindingSuggestionOption[];
};

const isDrillable = (value: any): boolean => isObject(value) && !isArray(value) && value !== null;

/** Child keys of `parentPath` (objects first, alphabetical), used for dot-drill suggestions. */
export const getBindingChildKeys = (data: Record<string, any>, parentPath: string): BindingSuggestionOption[] => {
  const parent = parentPath ? get(data, parentPath) : data;
  if (!isObject(parent) || parent === null || isArray(parent)) return [];

  return Object.entries(parent as Record<string, any>)
    // Hide only per-instance internal keys (`.../blockId`) at the root; `#collection`
    // namespaces and every other field stay listed.
    .filter(([key]) => parentPath || !key.includes("/"))
    .sort(([leftKey, leftVal], [rightKey, rightVal]) => {
      const rankDiff = (isDrillable(leftVal) ? 0 : 1) - (isDrillable(rightVal) ? 0 : 1);
      if (rankDiff !== 0) return rankDiff;
      return compareBindingFieldNames(leftKey, rightKey);
    })
    .map(([key, val]) => ({
      path: parentPath ? `${parentPath}.${key}` : key,
      type: getBindingTypeLabel(val),
      preview: getBindingPreview(val),
    }));
};

type BindingExpressionInputProps = {
  value: string;
  externalData: Record<string, any>;
  placeholder?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  onValueChange: (next: string) => void;
  /** Fired on Enter when the suggestion dropdown is closed. */
  onEnter?: () => void;
};

/**
 * Text input with the dot-drill binding path autocomplete used by the conditional
 * visibility editor: typing a token shows matching keys (objects first, with type
 * and truncated value), `.` after an object drills into its children. The dropdown
 * is portaled + viewport-clamped so panel/popover containers never clip it.
 */
export const BindingExpressionInput = ({
  value,
  externalData,
  placeholder,
  className,
  id,
  autoFocus,
  onValueChange,
  onEnter,
}: BindingExpressionInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestionMeta, setSuggestionMeta] = useState<SuggestionMeta | null>(null);
  // Ids wiring the input to its portaled dropdown (`aria-controls`/`aria-activedescendant`),
  // so screen readers announce the listbox and the highlighted option.
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const updateSuggestions = (nextValue: string, cursorPosition: number) => {
    const beforeCursor = nextValue.slice(0, cursorPosition);
    const tokenMatch = beforeCursor.match(/[A-Za-z_$][\w$.]*\.?$/);

    if (!tokenMatch) {
      setSuggestionMeta(null);
      return;
    }

    const token = tokenMatch[0];
    let options: BindingSuggestionOption[];

    if (token.endsWith(".")) {
      const parentPath = token.slice(0, -1);
      options = getBindingChildKeys(externalData, parentPath);
    } else {
      const dotIndex = token.lastIndexOf(".");
      if (dotIndex === -1) {
        options = getBindingChildKeys(externalData, "").filter((o) =>
          o.path.toLowerCase().startsWith(token.toLowerCase()),
        );
      } else {
        const parentPath = token.slice(0, dotIndex);
        const partial = token.slice(dotIndex + 1).toLowerCase();
        options = getBindingChildKeys(externalData, parentPath).filter((o) => {
          const leaf = o.path.slice(o.path.lastIndexOf(".") + 1);
          return leaf.toLowerCase().startsWith(partial);
        });
      }
    }

    if (!options.length) {
      setSuggestionMeta(null);
      setActiveIndex(0);
      return;
    }

    setSuggestionMeta({ start: cursorPosition - token.length, end: cursorPosition, options });
    setActiveIndex(0);
  };

  const applySuggestion = (rawPath: string, type: string) => {
    if (!suggestionMeta) return;

    const path = type === "JSON" ? `${rawPath}.` : rawPath;
    const nextValue = value.slice(0, suggestionMeta.start) + path + value.slice(suggestionMeta.end);

    onValueChange(nextValue);
    setSuggestionMeta(null);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      const cursorPosition = suggestionMeta.start + path.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
      updateSuggestions(nextValue, cursorPosition);
    });
  };

  useLayoutEffect(() => {
    if (!suggestionMeta || !listRef.current) return;
    const activeEl = listRef.current.children[activeIndex] as HTMLElement;
    if (activeEl) scrollSuggestionIntoView(listRef.current, activeEl);
  }, [activeIndex, suggestionMeta]);

  // Portal + fixed positioning so the dropdown is never clipped by a panel or
  // popover scroll container and never spills past a viewport edge.
  useLayoutEffect(() => {
    const popup = listRef.current;
    const anchor = inputRef.current;
    if (!suggestionMeta || !popup || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    popup.style.width = `${rect.width}px`;
    positionFixedPopup(popup, rect);
  }, [suggestionMeta]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        autoFocus={autoFocus}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!suggestionMeta}
        aria-controls={suggestionMeta ? listboxId : undefined}
        aria-activedescendant={suggestionMeta ? optionId(activeIndex) : undefined}
        onChange={(event) => {
          const nextValue = event.target.value;
          const cursorPosition = event.target.selectionStart ?? nextValue.length;
          onValueChange(nextValue);
          updateSuggestions(nextValue, cursorPosition);
        }}
        onBlur={() => {
          // Delay so a mousedown on a suggestion can apply before the dropdown unmounts.
          requestAnimationFrame(() => {
            if (document.activeElement !== inputRef.current) {
              setSuggestionMeta(null);
              setActiveIndex(0);
            }
          });
        }}
        onKeyDown={(event) => {
          if (suggestionMeta && suggestionMeta.options.length) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((prev) => (prev >= suggestionMeta.options.length - 1 ? 0 : prev + 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((prev) => (prev <= 0 ? suggestionMeta.options.length - 1 : prev - 1));
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              const selected = suggestionMeta.options[activeIndex];
              if (selected) applySuggestion(selected.path, selected.type);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setSuggestionMeta(null);
              setActiveIndex(0);
              return;
            }
          }
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />

      {suggestionMeta &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="bg-popover text-popover-foreground border-border fixed z-[9999] max-h-36 overflow-auto rounded-md border p-1 shadow-md">
            {suggestionMeta.options.map((option, index) => (
              <button
                key={option.path}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs ${
                  index === activeIndex ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applySuggestion(option.path, option.type);
                }}>
                <BindingOptionRow
                  label={option.path.slice(option.path.lastIndexOf(".") + 1)}
                  icon={option.path === "$index" || option.path.startsWith("$index.") ? "repeater" : "field"}
                  preview={option.preview}
                  right={
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {option.type === "JSON" ? "›" : option.type}
                    </span>
                  }
                />
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
