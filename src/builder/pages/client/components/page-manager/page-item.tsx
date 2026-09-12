import { find, get, isEmpty } from "lodash-es";
import { ChevronRight, File, Hash, Lock, MoreHorizontal, Pencil, Plus, StarsIcon } from "lucide-react";
import { useMemo } from "react";
import { PageActionsDropdown } from "~/builder/pages/client/components/page-action-dropdown";
import { usePageToUser, useUserId } from "~/builder/pages/client/realtime";
import { LANGUAGES } from "~/builder/pages/constants/LANGUAGES";
import { useFallbackLang } from "~/builder/pages/hooks/use-fallback-lang";
import { useChaiUserInfo } from "~/builder/pages/hooks/utils/use-chai-user-info";
import { usePageExpandManager } from "~/builder/pages/hooks/utils/use-page-expand-manager";
import { ChaiPage } from "~/builder/pages/utils/page-organization";
import Tooltip from "~/builder/pages/utils/tooltip";
import { Button } from "~/components/ui/button";
import { PageLinkContextMenu } from "./page-link-context-menu";

/**
 * ExpandCollapse
 * @param page - The ChaiPage node to control expand/collapse state for
 */
const ExpandCollapse = ({ page }: { page: ChaiPage }) => {
  const { isExpanded, toggleExpanded } = usePageExpandManager(page?.id);

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className={`h-6 w-6 hover:bg-secondary ${!page?.children?.length ? "opacity-0" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleExpanded();
      }}>
      <ChevronRight className={`duration-200 ${isExpanded ? "rotate-90" : ""}`} />
    </Button>
  );
};

/**
 * PageIcon
 * @param page - The ChaiPage node
 * @param pageType - The type object for the page
 */
const PageIcon = ({ page, pageType }: { page: ChaiPage; pageType: any }) => {
  return (
    <div className="flex h-full items-center justify-center gap-x-1">
      {page.dynamic ? (
        <StarsIcon size={12} className="text-yellow-400" />
      ) : pageType?.icon ? (
        <div
          className="flex h-4 max-h-4 w-4 max-w-4 items-center justify-center stroke-[1] text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: pageType.icon }}
        />
      ) : !pageType?.hasSlug ? (
        <Hash size={12} className="stroke-[1] text-muted-foreground" />
      ) : (
        <File size={12} className="stroke-[1] text-muted-foreground" />
      )}
    </div>
  );
};

/**
 * PageStatus
 * @param isOnline - Boolean indicating if the page is online (published)
 */
const PageStatus = ({ isOnline }: { isOnline: boolean }) => {
  return <div className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`} />;
};

/**
 *
 * PageItem
 * @param page - The ChaiPage node to render
 * @param pageTypes - List of all page types for lookup
 * @param currentPage - ID of the currently active page
 * @param onClickAction - Function to handle action clicks
 */
const PageItem = ({
  page,
  pageTypes,
  currentPage,
  onClickAction,
  languagePages,
  selectedLanguage,
  showUntranslatedPages,
}: {
  page: ChaiPage;
  pageTypes: any;
  currentPage: string;
  onClickAction: (action: string, page: any) => void;
  languagePages: Record<string, ChaiPage>;
  selectedLanguage: string;
  showUntranslatedPages: boolean;
}) => {
  const userId = useUserId();
  const { pageToUser } = usePageToUser();
  const pageOwnerId = get(pageToUser, [page?.id, "userId"]);
  const { data: pageOwnerData } = useChaiUserInfo(pageOwnerId);
  const pageOwner = pageOwnerData && userId !== pageOwnerId ? pageOwnerData?.name : null;
  const { toggleExpanded } = usePageExpandManager(page?.id);

  const fallbackLang = useFallbackLang();
  const isSelected = currentPage === page.id;
  const pageType = useMemo(() => find(pageTypes, { key: page.pageType }), [pageTypes, page.pageType]);
  // Folders have no content — clicking them expands/collapses instead of opening the editor
  const isFolder = page.pageType === "_folder";

  // * Check
  let langPage: any = get(languagePages, page?.id);
  langPage = get(langPage, "lang") === selectedLanguage ? langPage : null;
  const hasLangPage = selectedLanguage === fallbackLang || Boolean(langPage);

  // * Getting page name and page slug
  const pageName = langPage?.name || page?.name || "No name";
  let pageSlug = langPage?.slug || page?.slug || "";
  const fullSlug =
    pageSlug +
    (page?.dynamic ? `/${pageType?.dynamicSlug}` : "") +
    (page?.dynamicSlugCustom ? `${page.dynamicSlugCustom}` : "");

  if (pageSlug.startsWith("/") && !showUntranslatedPages) {
    const last = pageSlug.split("/").pop();
    pageSlug = pageSlug.endsWith(last) && page.dynamic ? "" : `/${last}`;
  }

  const containerClass = useMemo(() => {
    const baseClass = `flex h-7 min-w-0 flex-1 cursor-pointer select-none items-center gap-x-1.5 rounded px-px text-xs duration-300 border-[1px]`;
    const activeClass = `${isSelected ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-border hover:bg-accent"}`;

    if (!hasLangPage)
      return `${baseClass} bg-muted/30 opacity-50 group-hover:border-border border-transparent group-hover:bg-accent`;

    return `${baseClass} ${activeClass} ${pageOwner ? "opacity-60" : ""}`;
  }, [hasLangPage, isSelected, pageOwner]);

  const hasUnpublishedChanges = useMemo(() => {
    if (page.isPartialGroup || page.pageType === "_folder") return false;
    if (langPage) {
      if (!langPage.online || isEmpty(langPage.changes)) return false;
    } else if (page) {
      if (!page.online || isEmpty(page.changes)) return false;
    }
    return true;
  }, [langPage, page]);

  return (
    <div className="group relative">
      <PageLinkContextMenu pageId={page.id}>
        <div
          onClick={() =>
            page.isPartialGroup || isFolder ? toggleExpanded() : hasLangPage && onClickAction("select", page?.id)
          }
          className={containerClass}>
          {(pageType?.hasSlug !== false || page.isPartialGroup) && <ExpandCollapse page={page} />}
          {!page.isPartialGroup && !isFolder && <PageStatus isOnline={langPage ? langPage.online : page.online} />}
          {!page.isPartialGroup && <PageIcon page={page} pageType={pageType} />}

          <Tooltip content={pageName} side="top" showTooltip={pageName.length > 35}>
            <span className="max-w-[40%] truncate font-medium text-foreground">{pageName}</span>
          </Tooltip>
          {(pageSlug || page.dynamic) && (
            <Tooltip content={fullSlug} side="top" showTooltip>
              <span className="max-w-[40%] truncate font-mono text-xs text-muted-foreground">
                {pageSlug}
                {page.dynamic && pageType?.dynamicSlug && (
                  <span className="text-xs text-muted-foreground">
                    /{pageType?.dynamicSlug}
                    {page.dynamicSlugCustom}
                  </span>
                )}
              </span>
            </Tooltip>
          )}
          {hasUnpublishedChanges && (
            <Tooltip content="Has unpublished changes" side="top">
              <span className="text-warning">
                <Pencil size={12} className="stroke-[2]" />
              </span>
            </Tooltip>
          )}
          {/* HIDDEN: Template icon indicator
          {isTemplate && (
            <Tooltip content="Template" side="top">
              <span className="text-blue-500">
                <NotepadText size={16} />
              </span>
            </Tooltip>
          )}
          */}

          {!page.isPartialGroup && hasLangPage && !pageOwner ? (
            <div className="duration absolute right-0.5 top-[3px]">
              <PageActionsDropdown
                isLanguagePage={Boolean(langPage)}
                page={langPage || page}
                setDuplicatePage={(arg) => onClickAction("duplicate", arg)}
                setAddEditPage={(arg) => onClickAction("edit", langPage || arg)}
                setUnpublishPage={(arg) => onClickAction("unpublish", arg)}
                setDeletePage={(arg) => onClickAction("delete", langPage || arg)}>
                <div className="hover:bg-surface m-0 cursor-pointer rounded border border-transparent p-0.5 duration-100 hover:border-border">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" onClick={(e) => e.stopPropagation()} />
                </div>
              </PageActionsDropdown>
            </div>
          ) : pageOwner ? (
            <span className="duration absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-x-1 text-xs text-destructive">
              <Lock className="h-3 w-3 fill-destructive/20 text-destructive" />
              <Tooltip content={`${pageOwner} is editing this page`}>
                <span className="font-bold">{pageOwner}</span>
              </Tooltip>
            </span>
          ) : null}
        </div>
      </PageLinkContextMenu>
      <>
        {!hasLangPage && !page.isPartialGroup && !pageOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClickAction("addLanguagePage", {
                language: selectedLanguage,
                page,
              });
            }}
            className="absolute right-0 top-1 flex -translate-x-1/2 items-center gap-x-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground opacity-0 duration-200 hover:bg-primary/90 group-hover:opacity-100">
            <Plus size={12} className="stroke-[3]" />{" "}
            <span className="text-[10px]">Add {get(LANGUAGES, selectedLanguage)} Page</span>
          </button>
        )}
      </>
    </div>
  );
};

export default PageItem;
