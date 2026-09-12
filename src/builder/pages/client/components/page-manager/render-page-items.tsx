import { Fragment } from "react/jsx-runtime";
import { usePageExpandManager } from "~/builder/pages/hooks/utils/use-page-expand-manager";
import { ChaiPage } from "~/builder/pages/utils/page-organization";
import PageItem from "./page-item";

/**
 * Recursive component to render page items at any nesting level
 * @param {ChaiPage[]} pages - Array of pages to be rendered
 * @param {number} tier - Tier of the rendered pages
 * @param {any} pageTypes - Object containing page types
 * @param {string} currentPage - ID of the currently active page
 */
const RenderPageItems = ({
  pages,
  tier,
  pageTypes,
  currentPage,
  onClickAction,
  languagePages,
  selectedLanguage,
  showUntranslatedPages,
}: {
  pages: ChaiPage[];
  tier: number;
  pageTypes: any;
  currentPage: string;
  onClickAction: (action: string, page: any) => void;
  languagePages: Record<string, ChaiPage>;
  selectedLanguage: string;
  showUntranslatedPages: boolean;
}) => {
  const { expandedPages } = usePageExpandManager();
  return (
    <div className="space-y-px" style={{ paddingLeft: `${tier * 10}px` }}>
      {pages.map((page) => (
        <Fragment key={page.id}>
          <PageItem
            page={page}
            pageTypes={pageTypes}
            currentPage={currentPage}
            onClickAction={onClickAction}
            languagePages={languagePages}
            selectedLanguage={selectedLanguage}
            showUntranslatedPages={showUntranslatedPages}
          />
          {page.children && page.children.length > 0 && expandedPages?.includes(page.id) && (
            <RenderPageItems
              pages={page.children}
              tier={tier + 1}
              pageTypes={pageTypes}
              currentPage={currentPage}
              onClickAction={onClickAction}
              languagePages={languagePages}
              selectedLanguage={selectedLanguage}
              showUntranslatedPages={showUntranslatedPages}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default RenderPageItems;
