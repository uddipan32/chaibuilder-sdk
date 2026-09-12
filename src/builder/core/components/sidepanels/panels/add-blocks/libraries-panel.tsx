import { CaretRightIcon, ReloadIcon } from "@radix-ui/react-icons";
import { clsx } from "cnfast";
import Fuse from "fuse.js";
import { useSetAtom } from "jotai";
import { capitalize, filter, first, get, groupBy, has, isEmpty, keys, map } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDragAndDrop, useIsDragAndDropEnabled } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks";
import { dragAndDropAtom } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { ChaiImage } from "~/builder/core/components/shared";
import { CHAI_BUILDER_EVENTS } from "~/builder/core/events";
import { pubsub } from "~/builder/core/pubsub";
import { useAddBlock } from "~/builder/hooks/use-add-block";
import { useLibraryBlocks } from "~/builder/hooks/use-library-blocks";
import { useSelectedLibrary } from "~/builder/hooks/use-selected-library";
import { useChaiLibraries } from "~/builder/register-apis";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { syncBlocksWithDefaultProps } from "~/registry";
import { ChaiLibrary, ChaiLibraryBlock } from "~/types/chaibuilder-editor-props";
import { ChaiBlock } from "~/types/common";
import { getBlocksFromHTML } from "~/utils/import-html/html-to-json";
import { ChaiDraggableBlock } from "./draggable-block";
import SearchInput from "./search-input";

export const BlockCard = ({
  block,
  library,
  parentId = undefined,
  position = -1,
}: {
  library: ChaiLibrary;
  block: ChaiLibraryBlock;
  parentId?: string;
  position?: number;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const getUILibraryBlock = useMemo(() => library?.getBlock || (() => []), [library]);
  const { addCoreBlock, addPredefinedBlock } = useAddBlock();
  const name = get(block, "name", get(block, "label"));
  const description = get(block, "description", "");
  const { onDragStart, onDragEnd } = useDragAndDrop();
  const isDragAndDropEnabled = useIsDragAndDropEnabled();
  const setDraggedBlock = useSetAtom(dragAndDropAtom);

  const addBlock = useCallback(
    async (e: any) => {
      e.stopPropagation();
      if (has(block, "component")) {
        addCoreBlock(block, parentId, position);
        pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
        return;
      }
      setIsAdding(true);
      let uiBlocks: string | ChaiBlock[] = await getUILibraryBlock({
        library,
        block,
      });
      if (typeof uiBlocks === "string") {
        uiBlocks = await getBlocksFromHTML(uiBlocks);
      }
      if (!isEmpty(uiBlocks)) addPredefinedBlock(syncBlocksWithDefaultProps(uiBlocks), parentId, position);
      pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
      setTimeout(() => setIsAdding(false), 1000);
    },
    [addCoreBlock, addPredefinedBlock, block, getUILibraryBlock, library, parentId, position],
  );

  const handleDragStart = (ev: any) => {
    if (!isDragAndDropEnabled) return;
    // Fetch the actual blocks asynchronously. The promise travels on the drag payload so a
    // drop that happens before the fetch settles can await it instead of inserting the
    // placeholder type below.
    const blocksPromise = getUILibraryBlock({ library, block }).then(async (uiBlocks: string | ChaiBlock[]) => {
      if (typeof uiBlocks === "string") {
        uiBlocks = await getBlocksFromHTML(uiBlocks);
      }
      const blocks = syncBlocksWithDefaultProps(uiBlocks as ChaiBlock[]);
      setDraggedBlock((prev) => (prev ? { ...prev, blocks } : prev));
      return blocks;
    });
    // Call onDragStart synchronously so isDragging and draggedBlock atom are set
    // immediately — dragover fires right away and needs both flags to show highlights.
    onDragStart(ev, { type: "Box", name: name, blocksPromise } as any, true);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ChaiDraggableBlock draggable={isDragAndDropEnabled} onDragStart={handleDragStart} onDragEnd={onDragEnd}>
          <div
            onClick={isAdding ? () => {} : addBlock}
            className={clsx(
              "relative mt-2 min-h-[45px] w-full max-w-full overflow-hidden rounded-md border border-border duration-200 hover:border-blue-500 hover:shadow-xl",
              isDragAndDropEnabled ? "" : "cursor-pointer",
            )}>
            {isAdding && (
              <div className="absolute flex h-full w-full items-center justify-center bg-background/70">
                <ReloadIcon className="h-4 w-4 animate-spin text-white" />
                <span className="pl-2 text-sm text-white">Adding...</span>
              </div>
            )}
            {block.preview ? (
              // `min-h` lives on the wrapper, not the image: a min-height on the image sets a
              // min-width through its aspect ratio, and a wide preview then pushes the card past
              // the panel width.
              <ChaiImage src={block.preview} className={`block h-auto w-full max-w-full rounded-md`} alt={name} />
            ) : (
              <div className="flex h-fit w-full flex-col items-center justify-center gap-1 rounded-md border border-border p-6 py-10 text-center">
                <p className="font-medium text-gray-800">{name}</p>
                {description && <p className="text-sm text-gray-600">{description}</p>}
              </div>
            )}
          </div>
        </ChaiDraggableBlock>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-xs">
          <p className="font-medium">{name}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const UILibrarySection = ({
  parentId,
  position,
  fromSidebar,
  searchTerm: controlledSearchTerm,
  onSearchChange,
}: {
  parentId?: string;
  position?: number;
  fromSidebar?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}) => {
  const [selectedLibrary, setLibrary] = useSelectedLibrary();
  const uiLibraries = useChaiLibraries();
  const library = uiLibraries.find((library) => library.id === selectedLibrary) || first(uiLibraries);
  const { data: libraryBlocks, isLoading, isError, resetLibrary } = useLibraryBlocks(library);
  // Support a controlled search term (single search box shared across all
  // add-block tabs) and an internal one (when used standalone).
  const isSearchControlled = controlledSearchTerm !== undefined;
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = isSearchControlled ? controlledSearchTerm : internalSearchQuery;
  const setSearchQuery = isSearchControlled ? onSearchChange || (() => {}) : setInternalSearchQuery;

  // Configure fuse search
  const fuse = useMemo(() => {
    if (libraryBlocks && Array.isArray(libraryBlocks) && libraryBlocks.length > 0) {
      return new Fuse(libraryBlocks, {
        keys: ["name", "label", "description", "group"],
        threshold: 0.4,
        ignoreLocation: true,
      });
    }
    return null;
  }, [libraryBlocks]);

  // Derive search results using useMemo
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !fuse) {
      return [];
    }

    return fuse.search(searchQuery).map((result) => result.item);
  }, [searchQuery, fuse]);

  // Filtering logic based on search
  const filteredBlocks = searchQuery.trim() && !isEmpty(searchResults) ? searchResults : libraryBlocks || [];

  const mergedGroups = groupBy(filteredBlocks, "group");
  const [manuallySelectedGroup, setGroup] = useState<string | null>(null);

  // Derive the actual selected group based on available groups
  const selectedGroup = useMemo(() => {
    if (isEmpty(keys(mergedGroups))) {
      return null;
    }

    // If manually selected group is still available, use it
    if (manuallySelectedGroup && mergedGroups[manuallySelectedGroup]) {
      return manuallySelectedGroup;
    }

    // Otherwise, select the first available group
    return first(keys(mergedGroups)) || null;
  }, [mergedGroups, manuallySelectedGroup]);

  const blocks = get(mergedGroups, selectedGroup || "", []);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [library, selectedGroup]);
  const handleMouseEnter = (group: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      if (!timeoutRef.current) return;
      setGroup(group);
    }, 400);
  };

  const handleRetry = () => {
    if (library?.id) resetLibrary(library.id);
  };

  if (isLoading)
    return (
      <div className="flex animate-pulse flex-col space-y-1 py-2">
        <div className="h-7 w-full rounded-md bg-accent" />
        <div className="h-7 w-full rounded-md bg-accent" />
        <div className="h-7 w-full rounded-md bg-accent" />
        <div className="h-3" />
        <div className="h-36 w-full rounded-md bg-accent" />
        <div className="h-36 w-full rounded-md bg-accent" />
        <div className="h-36 w-full rounded-md bg-accent" />
      </div>
    );

  // split the blocks into 2 arrays
  const firstBlocks = filter(blocks, (_block, index: number) => index % 2 === 0);
  const secondBlocks = filter(blocks, (_block, index: number) => index % 2 === 1);

  return (
    <>
      <div className="flex h-full max-h-full flex-col py-2">
        <div className="bg-surface relative flex h-full max-h-full flex-1 overflow-hidden">
          <div className={`flex h-full flex-1 ${fromSidebar ? "flex-col" : ""}`}>
            <div
              className={`flex max-h-full min-w-60 flex-col gap-1 ${fromSidebar ? "pb-2" : "w-60 max-w-60 px-1 pr-2"}`}>
              <div className="space-y-0">
                <Select value={library?.id} onValueChange={setLibrary}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select library")}>{library?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {uiLibraries.map((uiLibrary) => (
                      <SelectItem key={uiLibrary.id} value={uiLibrary.id}>
                        {uiLibrary.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex h-full max-h-full w-full flex-1 flex-col">
                {!fromSidebar && <hr className="mt-1 border-border" />}
                <div className={`no-scrollbar h-full max-h-full flex-1 overflow-y-auto ${fromSidebar ? "" : "pb-20"}`}>
                  {isEmpty(mergedGroups) ? (
                    <div className="mt-4 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      {searchQuery ? (
                        <p className="text-sm">{t("No matching blocks found")}</p>
                      ) : isError ? (
                        <>
                          <p className="text-sm">{t("Failed to load the UI library. Try again")}</p>
                          <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
                            <ReloadIcon className="h-4 w-4" />
                            {t("Retry")}
                          </Button>
                        </>
                      ) : (
                        <Label>{t("This library is empty")}</Label>
                      )}
                    </div>
                  ) : fromSidebar ? (
                    <Select value={selectedGroup ?? ""} onValueChange={setGroup}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("Select a group")} />
                      </SelectTrigger>
                      <SelectContent>
                        {map(mergedGroups, (_groupedBlocks, group) => (
                          <SelectItem key={group} value={group}>
                            {capitalize(t(group.toLowerCase()))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    map(mergedGroups, (_groupedBlocks, group) => (
                      <div
                        onMouseEnter={() => handleMouseEnter(group)}
                        onMouseLeave={() => timeoutRef.current && clearTimeout(timeoutRef.current)}
                        key={group}
                        role="button"
                        onClick={() => setGroup(group)}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-sm text-foreground transition-all ease-in-out hover:bg-gray-200 dark:hover:bg-gray-800",
                          group === selectedGroup ? "bg-primary text-primary-foreground hover:bg-primary/80" : "",
                        )}>
                        <span>{capitalize(t(group.toLowerCase()))}</span>
                        <CaretRightIcon className="ml-2 h-5 w-5" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              {!isSearchControlled && !isEmpty(mergedGroups) && fromSidebar && (
                <SearchInput value={searchQuery} setValue={setSearchQuery} />
              )}
            </div>
            <div className={`flex h-full max-h-full w-full flex-col border-border ${fromSidebar ? "" : "border-l h-full"}`}>
              <ScrollArea
                ref={scrollAreaRef}
                onMouseEnter={() => timeoutRef.current && clearTimeout(timeoutRef.current)}
                className="z-10 flex h-full max-h-full w-full flex-col gap-2 transition-all ease-linear">
                {isEmpty(blocks) && !isEmpty(mergedGroups) ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <p className="text-sm">{t("No blocks found in this group")}</p>
                  </div>
                ) : (
                  <div className={`grid w-full gap-2 ${fromSidebar ? "grid-cols-1 pb-20" : "grid-cols-2 px-2"}`}>
                    <div className="flex flex-col gap-1">
                      {firstBlocks.map((block: ChaiLibraryBlock, index: number) => (
                        <BlockCard
                          key={`block-${index}`}
                          parentId={parentId}
                          position={position}
                          block={block}
                          library={library as ChaiLibrary}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      {secondBlocks.map((block: ChaiLibraryBlock, index: number) => (
                        <BlockCard
                          key={`block-second-${index}`}
                          parentId={parentId}
                          position={position}
                          block={block}
                          library={library as ChaiLibrary}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <br />
                <br />
                <br />
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const UILibrariesPanel = ({
  parentId,
  position,
  fromSidebar,
  searchTerm,
  onSearchChange,
}: {
  parentId?: string;
  position?: number;
  fromSidebar?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}) => {
  return (
    <UILibrarySection
      parentId={parentId}
      position={position}
      fromSidebar={fromSidebar}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
    />
  );
};

export default UILibrariesPanel;
