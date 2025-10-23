import { draggedBlockAtom } from "@/core/components/canvas/dnd/atoms";
import { UILibrariesSelect } from "@/core/components/sidepanels/panels/add-blocks/libraries-select";
import { CHAI_BUILDER_EVENTS } from "@/core/events";
import { useChaiLibraries } from "@/core/extensions/libraries";
import { cn } from "@/core/functions/common-functions";
import { useAddBlock, useBlockHighlight, useSelectedBlockIds } from "@/core/hooks";
import { useLibraryBlocks } from "@/core/hooks/use-library-blocks";
import { useSelectedLibrary } from "@/core/hooks/use-selected-library";
import { getBlocksFromHTML } from "@/core/import-html/html-to-json";
import { pubsub } from "@/core/pubsub";
import { ChaiBlock } from "@/types/chai-block";
import { ChaiLibrary, ChaiLibraryBlock } from "@/types/chaibuilder-editor-props";
import { Button } from "@/ui/shadcn/components/ui/button";
import { Input } from "@/ui/shadcn/components/ui/input";
import { ScrollArea } from "@/ui/shadcn/components/ui/scroll-area";
import { Skeleton } from "@/ui/shadcn/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/shadcn/components/ui/tooltip";
import { syncBlocksWithDefaults } from "@chaibuilder/runtime";
import { CaretRightIcon } from "@radix-ui/react-icons";
import clsx from "clsx";
import { useFeature } from "flagged";
import Fuse from "fuse.js";
import { useAtom } from "jotai";
import { capitalize, filter, first, get, groupBy, has, isEmpty, keys, map } from "lodash-es";
import { ReloadIcon, MagnifyingGlassIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const BlockCard = ({
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
  const [, setSelected] = useSelectedBlockIds();
  const { clearHighlight } = useBlockHighlight();
  const name = get(block, "name", get(block, "label"));
  const description = get(block, "description", "");
  const dnd = useFeature("dnd");
  const [, setDraggedBlock] = useAtom(draggedBlockAtom);

  const isTopLevelSection = (block: ChaiBlock) => {
    const isPageSection = has(block, "styles_attrs.data-page-section");
    return block._type === "Box" && isPageSection;
  };

  const addBlock = useCallback(
    async (e: any) => {
      e.stopPropagation();
      if (has(block, "component")) {
        addCoreBlock(block, parentId, position);
        pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
        return;
      }
      setIsAdding(true);
      let uiBlocks: string | ChaiBlock[] = await getUILibraryBlock({ library, block });
      if (typeof uiBlocks === "string") {
        uiBlocks = getBlocksFromHTML(uiBlocks);
      }
      if (!isEmpty(uiBlocks)) addPredefinedBlock(syncBlocksWithDefaults(uiBlocks), parentId, position);
      pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
    },
    [addCoreBlock, addPredefinedBlock, block, getUILibraryBlock, library, parentId, position],
  );

  const handleDragStart = async (ev) => {
    const uiBlocks = await getUILibraryBlock({ library, block });
    let parent = parentId;
    if (isTopLevelSection(first(uiBlocks))) {
      parent = null;
    }

    if (!isEmpty(uiBlocks)) {
      const convertedBlock = { blocks: uiBlocks, uiLibrary: true, parent: parent };
      ev.dataTransfer.setData("text/plain", JSON.stringify(convertedBlock));

      if (block.preview) {
        const img = new Image();
        img.src = block.preview;
        img.onload = () => {
          ev.dataTransfer.setDragImage(img, 0, 0);
        };
      } else {
        ev.dataTransfer.setDragImage(new Image(), 0, 0);
      }

      //@ts-ignore
      setDraggedBlock(convertedBlock);
      setTimeout(() => {
        setSelected([]);
        clearHighlight();
        pubsub.publish(CHAI_BUILDER_EVENTS.CLOSE_ADD_BLOCK);
      }, 200);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={isAdding ? () => {} : addBlock}
          draggable={dnd ? "true" : "false"}
          onDragStart={handleDragStart}
          className={clsx(
            "relative mt-2 cursor-pointer overflow-hidden rounded-md border border-border duration-200 hover:border-blue-500 hover:shadow-xl",
          )}>
          {isAdding && (
            <div className="absolute flex h-full w-full items-center justify-center bg-black/70">
              <ReloadIcon className="h-4 w-4 animate-spin text-white" />
              <span className="pl-2 text-sm text-white">Adding...</span>
            </div>
          )}
          {block.preview ? (
            <img src={block.preview} className="min-h-[45px] w-full rounded-md" alt={name} />
          ) : (
            <div className="flex h-fit w-full flex-col items-center justify-center gap-1 rounded-md border border-border p-6 py-10 text-center">
              <p className="font-medium text-gray-800">{name}</p>
              {description && <p className="text-sm text-gray-600">{description}</p>}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-xs">
          <p className="font-medium">{name}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const UILibrarySection = ({ parentId, position }: { parentId?: string; position?: number }) => {
  const [selectedLibrary, setLibrary] = useSelectedLibrary();
  const uiLibraries = useChaiLibraries();
  const library = uiLibraries.find((library) => library.id === selectedLibrary) || first(uiLibraries);
  const { data: libraryBlocks, isLoading, resetLibrary } = useLibraryBlocks(library);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChaiLibraryBlock[]>([]);

  // Configure fuse search
  const fuse = useRef<Fuse<ChaiLibraryBlock> | null>(null);

  useEffect(() => {
    if (libraryBlocks && libraryBlocks.length > 0) {
      fuse.current = new Fuse(libraryBlocks, {
        keys: ["name", "label", "description", "group"],
        threshold: 0.4,
        ignoreLocation: true,
      });
    }
  }, [libraryBlocks]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim() || !fuse.current) {
      setSearchResults([]);
      return;
    }

    const results = fuse.current.search(searchQuery).map((result) => result.item);
    setSearchResults(results);
  }, [searchQuery]);

  // Filtering logic based on search
  const filteredBlocks = searchQuery.trim() && !isEmpty(searchResults) ? searchResults : libraryBlocks;

  const mergedGroups = groupBy(filteredBlocks, "group");
  const [selectedGroup, setGroup] = useState(null);

  // Reset or update selected group when groups change
  useEffect(() => {
    if (isEmpty(keys(mergedGroups))) {
      setGroup(null);
      return;
    }

    // If current selected group isn't available anymore, select the first available one
    if (!selectedGroup || !mergedGroups[selectedGroup]) {
      setGroup(first(keys(mergedGroups)));
      return;
    }
  }, [mergedGroups, selectedGroup]);

  const blocks = get(mergedGroups, selectedGroup, []);
  const timeoutRef = useRef(null);
  const { t } = useTranslation();

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

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  if (isLoading)
    return (
      <div className="mt-4 grid h-full w-full grid-cols-12 gap-2">
        <Skeleton className="col-span-3 h-full" />
        <Skeleton className="col-span-9 h-full" />
      </div>
    );

  // split the blocks into 2 arrays
  const firstBlocks = filter(blocks, (_block, index: number) => index % 2 === 0);
  const secondBlocks = filter(blocks, (_block, index: number) => index % 2 === 1);

  return (
    <>
      <div className="flex h-full max-h-full flex-col">
        <div className="flex items-center gap-2 border-border py-2">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search blocks...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                <Cross1Icon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative flex h-full max-h-full flex-1 overflow-hidden bg-background">
          <div className={"flex h-full flex-1 pt-2"}>
            <div className={"flex h-full max-h-full w-60 min-w-60 max-w-60 flex-col gap-1 px-1 pr-2"}>
              <UILibrariesSelect library={library?.id} setLibrary={setLibrary} uiLibraries={uiLibraries} />
              <div className="mt-2 flex h-full max-h-full w-full flex-1 flex-col">
                <span className="text-xs font-bold text-gray-500">{t("Groups")}</span>
                <hr className="mt-1 border-border" />
                <div className="no-scrollbar mt-2 h-full max-h-full flex-1 overflow-y-auto pb-20">
                  {isEmpty(mergedGroups) ? (
                    <div className="mt-4 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      {searchQuery ? (
                        <p className="text-sm">{t("No matching blocks found")}</p>
                      ) : (
                        <>
                          <p className="text-sm">{t("Failed to load the UI library. Try again")}</p>
                          <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
                            <ReloadIcon className="h-4 w-4" />
                            {t("Retry")}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    map(mergedGroups, (_groupedBlocks, group) => (
                      <div
                        onMouseEnter={() => handleMouseEnter(group)}
                        onMouseLeave={() => clearTimeout(timeoutRef.current)}
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
            </div>
            <div className="flex h-full max-h-full w-full flex-col border-l border-border">
              <ScrollArea
                onMouseEnter={() => (timeoutRef.current ? clearTimeout(timeoutRef.current) : null)}
                className="z-10 flex h-full max-h-full w-full flex-col gap-2 transition-all ease-linear">
                {isEmpty(blocks) && !isEmpty(mergedGroups) ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <p className="text-sm">{t("No blocks found in this group")}</p>
                  </div>
                ) : (
                  <div className="grid w-full grid-cols-2 gap-2 px-2">
                    <div className="flex flex-col gap-1">
                      {firstBlocks.map((block: ChaiLibraryBlock, index: number) => (
                        <BlockCard
                          key={`block-${index}`}
                          parentId={parentId}
                          position={position}
                          block={block}
                          library={library}
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
                          library={library}
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

const UILibrariesPanel = ({ parentId, position }: { parentId?: string; position?: number }) => {
  return <UILibrarySection parentId={parentId} position={position} />;
};

export default UILibrariesPanel;
