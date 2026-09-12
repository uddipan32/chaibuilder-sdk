import { useDebouncedCallback } from "@react-hookz/web";
import { Filter, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentBlocks } from "~/builder/atoms/store";
import { cn } from "~/builder/core/functions/common-functions";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getRegisteredChaiBlock } from "~/registry";
import { ChaiBlock } from "~/types/common";
import SearchInput from "../add-blocks/search-input";
import { TypeIcon } from "./block-type-icon";
import { filterOutlineBlocks } from "./filter-outline-blocks";

interface SearchAndFilterOutlineProps {
  treeData: any[];
}

export const SearchAndFilterOutline = ({ treeData }: SearchAndFilterOutlineProps) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBlocks, setFilteredBlocks] = useState<ChaiBlock[] | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [onlyConditional, setOnlyConditional] = useState(false);
  const [onlyBindings, setOnlyBindings] = useState(false);
  const [onlyAnimations, setOnlyAnimations] = useState(false);
  const [ids, setIds] = useSelectedBlockIds();
  const [, setStyleBlocks] = useSelectedStylingBlocks();
  const containerRef = useRef<HTMLDivElement>(null);
  const [topOffset, setTopOffset] = useState(80);

  useEffect(() => {
    if (containerRef.current) {
      const searchRow = containerRef.current.firstElementChild;
      if (searchRow) {
        setTopOffset(searchRow.getBoundingClientRect().height + (searchRow as HTMLElement).offsetTop);
      }
    }
  }, [filteredBlocks]);

  const hasActiveFilters = selectedTypes.length > 0 || onlyConditional || onlyBindings || onlyAnimations;

  const uniqueBlockTypes = useMemo(() => {
    const types = new Set<string>();
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (node._type) types.add(node._type);
        if (node.children) walk(node.children);
      }
    };
    walk(treeData);
    return Array.from(types).sort();
  }, [treeData]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setOnlyConditional(false);
    setOnlyBindings(false);
    setOnlyAnimations(false);
  };

  const applyFilters = useDebouncedCallback(
    ({
      term,
      types,
      conditionalOnly,
      bindingsOnly,
      animationsOnly,
    }: {
      term: string;
      types: string[];
      conditionalOnly: boolean;
      bindingsOnly: boolean;
      animationsOnly: boolean;
    }) => {
      if (!term.trim() && types.length === 0 && !conditionalOnly && !bindingsOnly && !animationsOnly) {
        setFilteredBlocks(null);
        return;
      }

      const fullBlocks = new Map(getCurrentBlocks().map((b) => [b._id, b]));
      setFilteredBlocks(
        filterOutlineBlocks(treeData, {
          term,
          types,
          conditionalOnly,
          bindingsOnly,
          animationsOnly,
          fullBlocks,
          getContentProps: (type) => getRegisteredChaiBlock(type)?.i18nProps ?? [],
        }),
      );
    },
    [treeData, setFilteredBlocks],
    300,
  );

  useEffect(() => {
    applyFilters({
      term: searchTerm,
      types: selectedTypes,
      conditionalOnly: onlyConditional,
      bindingsOnly: onlyBindings,
      animationsOnly: onlyAnimations,
    });
  }, [searchTerm, selectedTypes, onlyConditional, onlyBindings, onlyAnimations, applyFilters]);

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-1 py-2" onClick={(e) => e.stopPropagation()}>
        <SearchInput value={searchTerm} setValue={setSearchTerm} autoComplete="off" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-xs"
              variant="outline"
              aria-label={t("FILTERS")}
              title={t("FILTERS")}
              className={cn("relative h-8 w-8", hasActiveFilters && "bg-accent")}>
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{t("FILTERS")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>{t("Block types")}</span>
                {selectedTypes.length > 0 && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {selectedTypes.length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>{t("BLOCK TYPES")}</DropdownMenuLabel>
                  <div className="max-h-64 w-36 overflow-y-auto">
                    {uniqueBlockTypes.map((type) => (
                      <DropdownMenuCheckboxItem
                        className="pl-2 pr-6 [&>span]:left-auto [&>span]:right-2"
                        key={type}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          setSelectedTypes((prev) =>
                            checked === true ? (prev.includes(type) ? prev : [...prev, type]) : prev.filter((t) => t !== type),
                          );
                        }}>
                        <TypeIcon type={type} /> {type}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuCheckboxItem
              className="pl-2 pr-6 [&>span]:left-auto [&>span]:right-2"
              checked={onlyConditional}
              onCheckedChange={(checked) => setOnlyConditional(checked === true)}>
              {t("Conditional")}
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              className="pl-2 pr-6 [&>span]:left-auto [&>span]:right-2"
              checked={onlyBindings}
              onCheckedChange={(checked) => setOnlyBindings(checked === true)}>
              {t("Data binding")}
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              className="pl-2 pr-6 [&>span]:left-auto [&>span]:right-2"
              checked={onlyAnimations}
              onCheckedChange={(checked) => setOnlyAnimations(checked === true)}>
              {t("Animations")}
            </DropdownMenuCheckboxItem>

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={clearFilters}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  {t("Clear filters")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {filteredBlocks !== null && (
        <div
          className="absolute inset-x-0 bottom-0 z-50 flex flex-col border-t border-border bg-background py-2"
          style={{ top: `${topOffset}px` }}
          onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="pl-1">
              {t("Search results")}
              {filteredBlocks.length > 0 ? ` (${filteredBlocks.length})` : ""}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="text-[10px]"
              title={t("Clear filters")}>
              <X className="h-3 w-3" /> {t("Clear filters")}
            </Button>
          </div>
          {filteredBlocks.length > 0 ? (
            <div
              className="flex flex-1 flex-col overflow-y-auto"
              style={{
                scrollbarGutter: "stable",
              }}>
              {filteredBlocks.map((block) => (
                <button
                  key={block._id}
                  type="button"
                  onClick={() => {
                    setStyleBlocks([]);
                    setIds([block._id]);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between space-x-2 rounded-sm px-1 py-1 text-left",
                    ids.includes(block._id) ? "bg-primary/20" : "hover:bg-accent/50 dark:hover:bg-accent",
                  )}>
                  <span className="truncate text-xs">{block._name || block._type}</span>
                  <span className="h-max rounded bg-muted p-1 text-[9px] leading-none">{block._type}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1 text-xs text-muted-foreground">{t("No matching blocks")}</div>
          )}
        </div>
      )}
    </div>
  );
};
