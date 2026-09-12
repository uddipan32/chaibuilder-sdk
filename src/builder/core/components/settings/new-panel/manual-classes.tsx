import { CheckIcon, CopyIcon, PlusIcon } from "@radix-ui/react-icons";
import { first, get, isEmpty, isFunction, map } from "lodash-es";
import { Component, X } from "lucide-react";
import { ReactNode, Suspense, lazy, useCallback, useMemo, useRef, useState } from "react";
import Autosuggest from "react-autosuggest";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DesignTokensIcon } from "~/builder/core/components/sidepanels/panels/design-tokens/DesignTokensIcon";
import { useDesignTokens } from "~/builder/core/design-tokens/use-design-tokens";
import { getSplitChaiClasses } from "~/builder/hooks/get-split-classes";
import { useAddClassesToBlocks } from "~/builder/hooks/use-add-classes-to-blocks";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useFeatureLabel } from "~/builder/hooks/use-feature-label";
import { usePermissions } from "~/builder/hooks/use-permissions";
import { useRemoveClassesFromBlocks } from "~/builder/hooks/use-remove-classes-from-blocks";
import { useSelectedBlock, useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import Tooltip from "~/builder/pages/utils/tooltip";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useFuseSearch } from "~/constants/CLASSES_LIST";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { DESIGN_TOKEN_PREFIX } from "~/constants/STRINGS";
import PanelItemWithAccordion from "./panel-item-with-accordion";
import { SuggestionsPortal } from "./suggestions-portal";

const ManageDesignTokensModal = lazy(() => import("../../../design-tokens/manage-design-tokens-modal"));

export function ManualClasses({
  from = "default",
  classFromProps,
  onAddNew,
  onRemove,
  showDesignTokenSuggestions = true,
}: {
  from?: "default" | "designToken";
  classFromProps?: string;
  onAddNew?: any;
  onRemove?: any;
  showDesignTokenSuggestions?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestionsAnchor, setSuggestionsAnchor] = useState<HTMLDivElement | null>(null);
  const [editingClass, setEditingClass] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [editingClassIndex, setEditingClassIndex] = useState(-1);
  const isSelectingSuggestion = useRef(false);
  const [isDesignTokenModalOpen, setIsDesignTokenModalOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canReadDesignTokens = hasPermission(CHAI_PERMISSIONS["design_tokens:read"]);
  const fuse = useFuseSearch();
  const { t } = useTranslation();
  const designTokensLabel = useFeatureLabel("designTokens");
  const [styleBlock] = useSelectedStylingBlocks();
  const block = useSelectedBlock();
  const addClassesToBlocks = useAddClassesToBlocks();
  const removeClassesFromBlocks = useRemoveClassesFromBlocks();
  const [selectedIds] = useSelectedBlockIds();
  const [newCls, setNewCls] = useState("");
  const designTokens = useDesignTokens();
  const prop = first(styleBlock)?.prop as string;
  const { classes: classesString } = getSplitChaiClasses(get(block, prop, ""));
  const classesSource = from === "default" ? classesString : (classFromProps ?? "");
  const classes = classesSource.split(" ").filter((cls) => !isEmpty(cls));

  // Sort classes to ensure design tokens ({DESIGN_TOKEN_PREFIX{id}) are always first
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      // Design tokens ({DESIGN_TOKEN_PREFIX}-{id}) should come first
      const aIsDesignToken = a.startsWith(DESIGN_TOKEN_PREFIX);
      const bIsDesignToken = b.startsWith(DESIGN_TOKEN_PREFIX);

      if (aIsDesignToken && !bIsDesignToken) return -1;
      if (!aIsDesignToken && bIsDesignToken) return 1;

      // If both are design tokens or both are regular classes, maintain original order
      return 0;
    });
  }, [classes]);
  const enableCopyToClipboard = useBuilderProp("flags.copyPaste", true);

  const renderClassBadge = (cls: string) => {
    const isDesignToken = cls.startsWith(DESIGN_TOKEN_PREFIX);
    const badge = (
      <div key={cls} className="group relative flex max-w-[260px] items-center">
        <button
          onDoubleClick={() => {
            setNewCls(getDisplayName(cls));
            if (from === "default") {
              removeClassesFromBlocks(selectedIds, [cls], true);
            } else {
              if (isFunction(onRemove)) onRemove(cls);
              setNewCls(cls);
            }
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 10);
          }}
          className={`group flex h-max cursor-default items-center gap-x-1 truncate break-words rounded py-px pl-0.5 pr-1 text-xs text-foreground/80 ${isDesignToken ? "bg-primary/20" : "bg-muted/30 dark:bg-muted/10"}`}>
          <X
            onClick={() => {
              if (from === "default") {
                removeClassesFromBlocks(selectedIds, [cls], true);
              } else if (isFunction(onRemove)) {
                onRemove(cls);
              }
            }}
            className="hidden h-3.5 w-3.5 cursor-pointer text-foreground/50 duration-300 hover:text-foreground group-hover:block"
          />
          {isDesignToken ? (
            <Component
              onClick={() => {
                if (from === "default") {
                  removeClassesFromBlocks(selectedIds, [cls], true);
                } else if (isFunction(onRemove)) {
                  onRemove(cls);
                }
              }}
              className="block h-3.5 w-3.5 rotate-45 cursor-pointer text-foreground duration-300 hover:text-foreground group-hover:hidden"
            />
          ) : (
            <svg
              className="block h-3.5 w-3.5 cursor-pointer fill-foreground/60 duration-300 hover:fill-foreground group-hover:hidden"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <g strokeWidth="0" />
              <g strokeLinecap="round" strokeLinejoin="round" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 6.036q-4 0-5 3.976 1.5-1.987 3.5-1.491c.761.189 1.305.738 1.906 1.345C13.387 10.855 14.522 12 17 12q4 0 5-3.976-1.5 1.987-3.5 1.491c-.761-.189-1.305-.738-1.907-1.345-.98-.99-2.114-2.134-4.593-2.134M7 12q-4 0-5 3.976 1.5-1.988 3.5-1.491c.761.189 1.305.738 1.907 1.345.98.989 2.115 2.134 4.594 2.134q4 0 5-3.976-1.5 1.987-3.5 1.491c-.761-.189-1.305-.738-1.906-1.345C10.613 13.145 9.478 12 7 12"
              />
            </svg>
          )}

          <div className="font-light">{getDisplayName(cls)}</div>
        </button>
      </div>
    );

    if (isDesignToken && designTokens[cls]) {
      return <Tooltip content={designTokens[cls].value}>{badge}</Tooltip>;
    }

    return badge;
  };

  // Helper function to get display name for classes
  const getDisplayName = (cls: string) => {
    if (cls.startsWith(DESIGN_TOKEN_PREFIX)) {
      const token = designTokens[cls];
      return token ? token.name : cls;
    }
    return cls;
  };

  // Helper function to convert design token names back to DESIGN_TOKEN_PREFIX-{id} format
  const convertToStorageFormat = useCallback(
    (className: string) => {
      // Check if this className matches any design token name
      const tokenEntry = Object.entries(designTokens).find(([, token]) => token.name === className);
      if (tokenEntry) {
        return `${tokenEntry[0]}`; // Return DESIGN_TOKEN_PREFIX-{id} format
      }
      return className; // Return as-is if not a design token
    },
    [designTokens],
  );

  const addNewClasses = useCallback(() => {
    const fullClsNames: string[] = newCls
      .trim()
      .replace(/ +(?= )/g, "")
      .split(" ")
      .map(convertToStorageFormat); // Convert design token names to DESIGN_TOKEN_PREFIX-{id} format

    if (from === "designToken") {
      if (isFunction(onAddNew)) onAddNew(fullClsNames);
    } else {
      addClassesToBlocks(selectedIds, fullClsNames, true);
    }
    setNewCls("");
  }, [newCls, from, onAddNew, addClassesToBlocks, selectedIds, convertToStorageFormat]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const designTokensEnabled = useBuilderProp("flags.designTokens", true);
  const handleSuggestionsFetchRequested = ({ value }: any) => {
    const search = value.trim().toLowerCase();
    const matches = search.match(/.+:/g);
    let classMatches: any[] = [];

    // Get design token suggestions
    let designTokenSuggestions: {
      name: string;
      id: string;
      isDesignToken: boolean;
    }[] = [];
    if (designTokensEnabled && showDesignTokenSuggestions) {
      if (search === "") {
        // Show all design tokens when no search term
        designTokenSuggestions = Object.entries(designTokens).map(([id, token]) => ({
          name: token.name,
          id: `${id}`,
          isDesignToken: true,
        }));
      } else {
        // Filter design tokens by search term
        designTokenSuggestions = Object.entries(designTokens)
          .filter(([, token]) => token.name.toLowerCase().includes(search))
          .map(([id, token]) => ({
            name: token.name,
            id: `${id}`,
            isDesignToken: true,
          }));
      }
    }
    if (matches && matches.length > 0) {
      const [prefix] = matches;
      const searchWithoutPrefix = search.replace(prefix, "");
      const fuseResults = fuse.search(searchWithoutPrefix);
      classMatches = fuseResults.map((result: any) => ({
        ...result,
        item: { ...result.item, name: prefix + result.item.name },
      }));
    } else {
      classMatches = fuse.search(search);
    }

    // Combine design tokens with regular class suggestions, design tokens first
    const allSuggestions = [...designTokenSuggestions, ...map(classMatches, "item")];
    return setSuggestions(allSuggestions);
  };

  const handleSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion: any) => {
    return suggestion.name; // Always return the display name
  };

  const renderSuggestion = (suggestion: any) => (
    <div className="flex items-center gap-2 rounded-md p-1">
      {suggestion.isDesignToken && <DesignTokensIcon className="h-4 w-4 text-gray-600" />}
      <span>{suggestion.name}</span>
    </div>
  );

  const renderSuggestionsContainer = useCallback(
    ({ containerProps, children }: { containerProps: Record<string, any>; children: ReactNode }) => (
      <SuggestionsPortal anchor={suggestionsAnchor} containerProps={containerProps}>
        {children}
      </SuggestionsPortal>
    ),
    [suggestionsAnchor],
  );

  const inputProps = useMemo(
    () => ({
      ref: inputRef,
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      placeholder: showDesignTokenSuggestions
        ? t("Enter classes separated by space or design tokens")
        : t("Enter classes separated by space"),
      value: newCls,
      onFocus: (e: any) => {
        setTimeout(() => {
          if (e.target) e.target.select();
        }, 0);
      },
      onKeyDown: (e: any) => {
        if (e.key === "Enter" && newCls.trim() !== "") {
          if (isSelectingSuggestion.current) {
            isSelectingSuggestion.current = false;
            return;
          }
          e.preventDefault();
          addNewClasses();
        }
        if (e.key === "Tab" && suggestions.length > 0) {
          e.preventDefault();
          // Simulate ArrowDown to highlight
          const downEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            code: "ArrowDown",
            keyCode: 40,
            bubbles: true,
          });
          e.target.dispatchEvent(downEvent);
        }
      },
      onChange: (_e: any, { newValue }: any) => setNewCls(newValue),
      className: `flex h-7 w-full rounded-md border border-input bg-transparent px-2 py-0 text-xs text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${from === "default" ? "" : "py-1.5"}`,
    }),
    [showDesignTokenSuggestions, t, newCls, from, suggestions.length, addNewClasses, designTokensLabel],
  );

  const handleEditClass = (clsToRemove: string) => {
    const fullClsNames: string[] = editingClass
      .trim()
      .replace(/ +(?= )/g, "")
      .split(" ")
      .map(convertToStorageFormat); // Convert design token names to DESIGN_TOKEN_PREFIX-{id} format
    removeClassesFromBlocks(selectedIds, [clsToRemove], true);
    addClassesToBlocks(selectedIds, fullClsNames, true);
    setEditingClass("");
    setEditingClassIndex(-1);
  };

  const onClickCopy = () => {
    if (navigator.clipboard === undefined) {
      toast.error(t("Clipboard not supported"));
      return;
    }
    navigator.clipboard.writeText(classes.join(" "));
    toast.success(t("Classes copied to clipboard"), { duration: 2000 });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyButton = () => {
    return (
      <Tooltip content={t("Copy classes to clipboard")}>
        {isCopied ? (
          <CheckIcon className="h-3 w-3 rounded border border-success bg-success/10 text-success" />
        ) : (
          <CopyIcon
            onClick={(e) => {
              e.stopPropagation();
              onClickCopy();
            }}
            className={"h-3 w-3 cursor-pointer"}
          />
        )}
      </Tooltip>
    );
  };

  const renderList = () => {
    return (
      <div className="flex max-h-[50vh] w-full flex-wrap gap-1 overflow-y-auto overflow-x-hidden">
        {sortedClasses.map((cls: string, index: number) =>
          editingClassIndex === index ? (
            <input
              ref={inputRef}
              key={cls}
              value={editingClass}
              onChange={(e) => setEditingClass(e.target.value)}
              onBlur={() => {
                handleEditClass(cls);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditClass(cls);
                }
              }}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.select();
                }, 0);
              }}
              className="group relative flex max-w-[260px] cursor-default items-center gap-x-1 truncate break-words rounded border border-border bg-gray-200 p-px px-1.5 pr-2 text-[11px] text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
          ) : (
            renderClassBadge(cls)
          ),
        )}
      </div>
    );
  };

  if (from === "default") {
    return (
      <>
        <PanelItemWithAccordion
          value="manual-classes"
          defaultOpen={true}
          itemClassName="border-0"
          leftLabel={(open) => (
            <div className="flex items-center gap-x-1">
              {t("Classes")} {enableCopyToClipboard && open && copyButton()}
            </div>
          )}
          rightLabel={() =>
            canReadDesignTokens ? (
              <Button
                variant="link"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDesignTokenModalOpen(true);
                }}>
                {designTokensLabel}
              </Button>
            ) : null
          }>
          <div className={`flex w-full flex-col gap-y-1.5 pb-3`}>
            <div className={"relative flex items-center gap-x-1"}>
              <div ref={setSuggestionsAnchor} className="relative flex w-full items-center gap-x-1">
                <Autosuggest
                  suggestions={suggestions}
                  onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
                  onSuggestionsClearRequested={handleSuggestionsClearRequested}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  renderSuggestionsContainer={renderSuggestionsContainer}
                  inputProps={inputProps}
                  onSuggestionSelected={(_e, { suggestionValue }) => {
                    isSelectingSuggestion.current = true;
                    const storageFormat = convertToStorageFormat(suggestionValue);
                    const fullClsNames = [storageFormat];
                    addClassesToBlocks(selectedIds, fullClsNames, true);
                    setNewCls("");
                  }}
                  containerProps={{
                    className: "relative h-7 w-full border-border text-xs",
                  }}
                  theme={{
                    suggestion: "bg-transparent text-foreground",
                    suggestionHighlighted: "!bg-accent cursor-pointer",
                    suggestionsContainerOpen:
                      "bg-surface text-foreground text-xs no-scrollbar z-50 max-h-[220px] overflow-y-auto overflow-x-hidden border border-foreground/10 rounded-md shadow-md",
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={addNewClasses}
                disabled={newCls.trim() === ""}
                size="icon-sm"
                className="h-7 w-7">
                <PlusIcon />
              </Button>
            </div>
            {renderList()}
          </div>
        </PanelItemWithAccordion>
        {/* Design Token Management Modal */}
        <Suspense fallback={null}>
          <ManageDesignTokensModal open={isDesignTokenModalOpen} onOpenChange={setIsDesignTokenModalOpen} />
        </Suspense>
      </>
    );
  }

  return (
    <div className={`flex w-full flex-col gap-y-1.5 pb-3 ${from === "designToken" ? "border-none" : ""}`}>
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex w-full items-center justify-between gap-x-2 text-muted-foreground">
          <span className="flex items-center gap-x-1">
            <span>
              {from === "designToken" ? (
                <Label>{t("Token Classes")}</Label>
              ) : (
                <div className="text-xs font-medium text-foreground">{t("Classes")}</div>
              )}
            </span>
            {enableCopyToClipboard && copyButton()}
          </span>
        </div>
      </div>
      <div className={"relative flex items-center gap-x-1"}>
        <div ref={setSuggestionsAnchor} className="relative flex w-full items-center gap-x-1">
          <Autosuggest
            suggestions={suggestions}
            onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
            onSuggestionsClearRequested={handleSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            renderSuggestionsContainer={renderSuggestionsContainer}
            inputProps={inputProps}
            onSuggestionSelected={(_e, { suggestionValue }) => {
              isSelectingSuggestion.current = true;
              const storageFormat = convertToStorageFormat(suggestionValue);
              const fullClsNames = [storageFormat];
              if (from === "designToken") {
                if (isFunction(onAddNew)) onAddNew(fullClsNames);
              } else {
                addClassesToBlocks(selectedIds, fullClsNames, true);
              }
              setNewCls("");
            }}
            containerProps={{
              className: "relative h-7 w-full border-border text-xs",
            }}
            theme={{
              suggestion: "bg-transparent text-foreground",
              suggestionHighlighted: "!bg-accent cursor-pointer",
              suggestionsContainerOpen:
                "bg-surface text-foreground text-xs no-scrollbar z-50 max-h-[220px] overflow-y-auto overflow-x-hidden border border-foreground/10 rounded-md shadow-md",
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={addNewClasses}
          disabled={newCls.trim() === ""}
          size="icon-sm"
          className="h-7 w-7">
          <PlusIcon />
        </Button>
      </div>
      {renderList()}
    </div>
  );
}
