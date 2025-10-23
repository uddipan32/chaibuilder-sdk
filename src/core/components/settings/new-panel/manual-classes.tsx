import { AskAIStyles } from "@/core/components/settings/ask-ai-style";
import { useFuseSearch } from "@/core/constants/CLASSES_LIST";
import {
  useAddClassesToBlocks,
  useBuilderProp,
  useRemoveClassesFromBlocks,
  useSelectedBlock,
  useSelectedBlockIds,
  useSelectedStylingBlocks,
} from "@/core/hooks";
import { getSplitChaiClasses } from "@/core/hooks/get-split-classes";
import { Button } from "@/ui/shadcn/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/shadcn/components/ui/tooltip";
import { CopyIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { first, get, isEmpty, map } from "lodash-es";
import { useMemo, useRef, useState } from "react";
import Autosuggest from "react-autosuggest";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiIcon } from "../../ai/ai-icon";

export function ManualClasses() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingClass, setEditingClass] = useState("");
  const [editingClassIndex, setEditingClassIndex] = useState(-1);
  const fuse = useFuseSearch();
  const { t } = useTranslation();
  const [styleBlock] = useSelectedStylingBlocks();
  const block = useSelectedBlock();
  const addClassesToBlocks = useAddClassesToBlocks();
  const removeClassesFromBlocks = useRemoveClassesFromBlocks();
  const [selectedIds] = useSelectedBlockIds();
  const askAiCallBack = useBuilderProp("askAiCallBack", null);
  const [newCls, setNewCls] = useState("");
  const prop = first(styleBlock)?.prop as string;
  const { classes: classesString } = getSplitChaiClasses(get(block, prop, ""));
  const classes = classesString.split(" ").filter((cls) => !isEmpty(cls));

  const addNewClasses = () => {
    const fullClsNames: string[] = newCls
      .trim()
      .toLowerCase()
      .replace(/ +(?= )/g, "")
      .split(" ");

    addClassesToBlocks(selectedIds, fullClsNames, true);
    setNewCls("");
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleSuggestionsFetchRequested = ({ value }: any) => {
    const search = value.trim().toLowerCase();
    const matches = search.match(/.+:/g);
    let classMatches = [];
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
    return setSuggestions(map(classMatches, "item"));
  };

  const handleSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion: any) => suggestion.name;

  const renderSuggestion = (suggestion: any) => <div className="rounded-md p-1">{suggestion.name}</div>;

  const inputProps = useMemo(
    () => ({
      ref: inputRef,
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      placeholder: t("Enter classes separated by space"),
      value: newCls,
      onFocus: (e: any) => {
        setTimeout(() => {
          if (e.target) e.target.select();
        }, 0);
      },
      onKeyDown: (e: any) => {
        if (e.key === "Enter" && newCls.trim() !== "") {
          addNewClasses();
        }
      },
      onChange: (_e: any, { newValue }: any) => setNewCls(newValue),
      className: "w-full rounded-md text-xs px-2 hover:outline-0 bg-background border-border py-1",
    }),
    [newCls, t, inputRef],
  );

  const handleEditClass = (clsToRemove: string) => {
    debugger;
    const fullClsNames: string[] = editingClass
      .trim()
      .toLowerCase()
      .replace(/ +(?= )/g, "")
      .split(" ");
    removeClassesFromBlocks(selectedIds, [clsToRemove]);
    addClassesToBlocks(selectedIds, fullClsNames, true);
    setEditingClass("");
    setEditingClassIndex(-1);
  };

  const onClickCopy = () => {
    if (window) {
      if (navigator.clipboard === undefined) {
        toast.error(t("Clipboard not supported"));
        return;
      }
      navigator.clipboard.writeText(classes.join(" "));
      toast.success(t("Classes copied to clipboard"));
    }
  };

  return (
    <div className={`flex w-full flex-col gap-y-1.5 border-b border-border pb-4`}>
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-x-2 text-muted-foreground">
          <span>{t("Classes")}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <CopyIcon onClick={onClickCopy} className={"cursor-pointer"} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("Copy classes to clipboard")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {askAiCallBack ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" className="h-6 w-fit" size="sm">
                <AiIcon className="h-4 w-4" />
                <span className="ml-2">{t("Ask AI")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" className="p-2">
              <AskAIStyles blockId={block?._id} />
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      <div className={"relative flex items-center gap-x-3"}>
        <div className="relative flex w-full items-center gap-x-3">
          <Autosuggest
            suggestions={suggestions}
            onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
            onSuggestionsClearRequested={handleSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={inputProps}
            containerProps={{
              className: "relative h-8 w-full gap-y-1 py-1 border-border text-xs",
            }}
            theme={{
              suggestion: "bg-transparent",
              suggestionHighlighted: "!bg-gray-300 dark:!bg-gray-800 cursor-pointer",
              suggestionsContainerOpen:
                "absolute bg-background no-scrollbar z-50 max-h-[230px] overflow-y-auto w-full  border border-border rounded-md",
            }}
          />
        </div>
        <Button
          variant="outline"
          className="h-6 border-border"
          onClick={addNewClasses}
          disabled={newCls.trim() === ""}
          size="sm">
          <PlusIcon />
        </Button>
      </div>
      <div className="flex w-full flex-wrap gap-2 overflow-x-hidden">
        {classes.map((cls: string, index: number) =>
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
            <div key={cls} className="group relative flex max-w-[260px] items-center">
              <button
                onDoubleClick={() => {
                  setNewCls(cls);
                  removeClassesFromBlocks(selectedIds, [cls]);
                  setTimeout(() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }, 10);
                }}
                className="flex h-max cursor-default items-center gap-x-1 truncate break-words rounded bg-gray-200 py-px pl-0.5 pr-1 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <div className="z-10 flex h-full w-max items-center justify-center">
                  <Cross2Icon
                    onClick={() => removeClassesFromBlocks(selectedIds, [cls], true)}
                    className="hidden h-max w-3.5 cursor-pointer rounded bg-gray-100 p-0.5 text-red-500 hover:bg-gray-50 group-hover:block"
                  />
                  <svg
                    className="h-3.5 w-3.5 group-hover:hidden"
                    fill="rgba(55, 65, 81, 0.4)"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlSpace="preserve">
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 6.036c-2.667 0-4.333 1.325-5 3.976 1-1.325 2.167-1.822 3.5-1.491.761.189 1.305.738 1.906 1.345C13.387 10.855 14.522 12 17 12c2.667 0 4.333-1.325 5-3.976-1 1.325-2.166 1.822-3.5 1.491-.761-.189-1.305-.738-1.907-1.345-.98-.99-2.114-2.134-4.593-2.134zM7 12c-2.667 0-4.333 1.325-5 3.976 1-1.326 2.167-1.822 3.5-1.491.761.189 1.305.738 1.907 1.345.98.989 2.115 2.134 4.594 2.134 2.667 0 4.333-1.325 5-3.976-1 1.325-2.167 1.822-3.5 1.491-.761-.189-1.305-.738-1.906-1.345C10.613 13.145 9.478 12 7 12z"></path>
                    </g>
                  </svg>
                </div>
                <div>{cls}</div>
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
