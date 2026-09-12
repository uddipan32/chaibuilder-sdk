import { useAtom } from "jotai";
import { filter, groupBy } from "lodash-es";
import { Fragment, type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CoreBlock } from "~/builder/core/components/sidepanels/panels/add-blocks/core-block";
import { BlockCard } from "~/builder/core/components/sidepanels/panels/add-blocks/libraries-panel";
import { PartialBlockCard } from "~/builder/core/components/sidepanels/panels/add-blocks/partial-block-card";
import {
  canAcceptChildBlock,
  canBeNestedInside,
  isBlockAvailableForPageType,
} from "~/builder/core/functions/block-helpers";
import { useBlocksStore } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import {
  libraryBlocksAtom,
  useLibraryBlocks,
} from "~/builder/hooks/use-library-blocks";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import {
  useCheckPartialCanAdd,
  usePartialBlocksList,
} from "~/builder/hooks/use-partial-blocks-store";
import { usePrimaryPage } from "~/builder/pages/hooks/pages/use-current-page";
import { useChaiLibraries } from "~/builder/register-apis";
import { Label } from "~/components/ui/label";
import { useRegisteredChaiBlocks } from "~/registry";
import type { ChaiLibrary } from "~/types/chaibuilder-editor-props";
import { matchesGlobalSearch } from "./global-search";

const LibraryLoader = ({ library }: { library: ChaiLibrary }) => {
  useLibraryBlocks(library);
  return null;
};

const formatPartialName = (name: string) =>
  name
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wide text-forground ">
    {children}
  </h2>
);

export const GlobalSearchResults = ({
  searchTerm,
  parentId,
  position,
  activeTab,
}: {
  searchTerm: string;
  parentId?: string;
  position?: number;
  /** The Add Block tab that was active when the search started ("core" | "partials" |
   * "library" | ...). Its section is listed first so the results the user most
   * likely wants sit at the top; the remaining sections keep their default order. */
  activeTab?: string;
}) => {
  const { t } = useTranslation();
  const chaiBlocks = useRegisteredChaiBlocks();
  const { data: currentPage } = usePrimaryPage();
  const layoutPagesEnabled = useBuilderProp("flags.layoutPages", false);
  const dnd = useBuilderProp("flags.dragAndDrop", true);
  const [allBlocks] = useBlocksStore();
  const parentType = allBlocks.find((block) => block._id === parentId)?._type;
  const { data: partialBlocksList } = usePartialBlocksList();
  const checkPartialCanAdd = useCheckPartialCanAdd();
  const libraries = useChaiLibraries();
  const [libraryBlocks] = useAtom(libraryBlocksAtom);
  const currentPageType = currentPage?.pageType || "page";
  const showPageSlot = layoutPagesEnabled && currentPageType === "_layout";

  const partialResults = useMemo(
    () =>
      Object.entries(partialBlocksList || {})
        .map(([id, data]) => {
          const block = data as {
            name?: string;
            description?: string;
            type?: string;
            tags?: string[];
          };
          const { canAdd, reason } = checkPartialCanAdd(id);
          return {
            type: "PartialBlock",
            label: formatPartialName(block.name || id),
            description: block.description || "",
            group: formatPartialName(block.type || "partial"),
            category: "partial",
            partialBlockId: id,
            tags: block.tags || [],
            disabled: !canAdd,
            disabledReason: reason,
          };
        })
        .filter((block) =>
          matchesGlobalSearch(searchTerm, [
            block.label,
            block.description,
            block.group,
            ...block.tags,
          ]),
        ),
    [checkPartialCanAdd, partialBlocksList, searchTerm],
  );

  const coreResults = useMemo(
    () =>
      filter(chaiBlocks, { category: "core" })
        .filter((block) => isBlockAvailableForPageType(block, currentPageType))
        .map((block) =>
          block.type === "PageSlot" && showPageSlot
            ? { ...block, hidden: false }
            : block,
        )
        .filter(
          (block) =>
            !block.hidden &&
            matchesGlobalSearch(searchTerm, [
              block.label,
              block.type,
              block.group,
              block.category,
            ]),
        ),
    [chaiBlocks, currentPageType, searchTerm, showPageSlot],
  );

  const libraryResults = useMemo(
    () =>
      libraries.flatMap((library) =>
        (libraryBlocks[library.id]?.blocks || [])
          .filter((block) =>
            matchesGlobalSearch(searchTerm, [
              block.name,
              block.label,
              block.description,
              block.group,
              ...(block.tags || []),
            ]),
          )
          .map((block) => ({ block, library })),
      ),
    [libraries, libraryBlocks, searchTerm],
  );

  const coreByGroup = useMemo(
    () => groupBy(coreResults, "group"),
    [coreResults],
  );
  const librariesLoading = libraries.some(
    (library) => libraryBlocks[library.id]?.loading !== "complete",
  );
  const hasResults =
    partialResults.length > 0 ||
    coreResults.length > 0 ||
    libraryResults.length > 0;

  const partialSection =
    partialResults.length > 0 ? (
      <section className="space-y-1">
        <SectionHeading>{t("Global Blocks")}</SectionHeading>
        <div className="space-y-2">
          {partialResults.map((block) => (
            <PartialBlockCard
              key={block.partialBlockId}
              block={block}
              parentId={parentId}
              position={position}
              disabled={block.disabled}
            />
          ))}
        </div>
      </section>
    ) : null;

  const coreSection =
    coreResults.length > 0 ? (
      <section className="space-y-1">
        <SectionHeading>{t("Blocks")}</SectionHeading>
        {Object.entries(coreByGroup).map(([group, blocks]) => (
          <div key={group} className="space-y-2">
            <Label className="text-[11px] uppercase text-muted-foreground">{t(group)}</Label>
            <div className="grid grid-cols-2 gap-2">
              {blocks.map((block) => {
                const disabled =
                  !dnd && (!canAcceptChildBlock(parentType!, block.type) || !canBeNestedInside(parentType!, block.type));
                return (
                  <CoreBlock key={block.type} block={block} parentId={parentId} position={position} disabled={disabled} />
                );
              })}
            </div>
          </div>
        ))}
      </section>
    ) : null;

  const librarySection =
    libraryResults.length > 0 ? (
      <section className="space-y-1">
        <SectionHeading>{t("Library")}</SectionHeading>
        <div className="grid grid-cols-1 gap-2">
          {libraryResults.map(({ block, library }) => (
            <BlockCard
              key={`${library.id}-${block.id}`}
              block={block}
              library={library}
              parentId={parentId}
              position={position}
            />
          ))}
        </div>
      </section>
    ) : null;

  // Default order, with the active tab's section hoisted to the top.
  const sections = [
    { key: "partials", node: partialSection },
    { key: "core", node: coreSection },
    { key: "library", node: librarySection },
  ];
  const orderedSections = [
    ...sections.filter((section) => section.key === activeTab),
    ...sections.filter((section) => section.key !== activeTab),
  ];

  return (
    <>
      {libraries.map((library) => (
        <LibraryLoader key={library.id} library={library} />
      ))}
      {/* A plain scroller, not `ScrollArea`: Radix wraps the viewport's children in a
          `display: table` box, which is shrink-to-fit — a nowrap/truncated line (the global
          block descriptions) or a wide preview sizes it past the panel and the rows spill
          out of the panel's right edge. */}
      <div className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-6 py-2">
          {orderedSections.map(({ key, node }) => node && <Fragment key={key}>{node}</Fragment>)}

          {!hasResults && !librariesLoading ? (
            <div className="flex justify-center item-center min-h-full p-8 text-center text-sm text-muted-foreground">
              {t("No results found")}
            </div>
          ) : !hasResults ? (
            <div className="flex justify-center min-h-full p-8 text-center text-sm text-muted-foreground">
              {t("Searching...")}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
