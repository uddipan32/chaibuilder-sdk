import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useCallback } from "react";
import { includes, filter, flatMap, find, isEmpty, union, uniq } from "lodash-es";

const expandedPagesAtom = atomWithStorage<string[]>("expandedPagesState", []);

/**
 * Flattens a nested tree structure into a single array
 */
const flatByChildren = (nodes: any[]): any[] => {
  return flatMap(nodes, (node) => [node, ...(node.children ? flatByChildren(node.children) : [])]);
};

/**
 * Finds the complete path from root to target page in nested structure
 */
const getParentPathFromNestedStructure = (pages: any[], targetId: string): string[] => {
  const findPath = (nodes: any[], path: string[] = []): string[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      if (node.id === targetId) {
        return currentPath;
      }
      if (node.children && node.children.length > 0) {
        const found = findPath(node.children, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  return findPath(pages) || [];
};

/**
 * Gets all parent page IDs for a given page, handling both flat and nested structures
 */
const getParentPagesIds = (pages: any[], currentPage: string): string[] => {
  if (!currentPage) return [];

  const flattenPages = flatByChildren(pages);
  const page = find(flattenPages, (p) => p.id === currentPage);

  if (page) {
    if (page.parent) {
      const parentPages = getParentPagesIds(pages, page.parent);
      return [...parentPages, currentPage];
    }

    const nestedPath = getParentPathFromNestedStructure(pages, currentPage);
    if (!isEmpty(nestedPath)) {
      return nestedPath;
    }
  }

  return [currentPage];
};
// Recursively finds all page IDs (and their parent paths) to expand for search visibility
const findPagesToExpandOnSearch = (pages: any[]): string[] => {
  const expandIds = new Set<string>();
  const traverse = (nodes: any[], parentPath: string[] = []) => {
    nodes.forEach((node) => {
      const currentPath = [...parentPath, node.id];
      if (node.shouldExpandOnSearch) {
        currentPath.forEach((id) => expandIds.add(id));
      }
      if (node.children && !isEmpty(node.children)) {
        traverse(node.children, currentPath);
      }
    });
  };
  traverse(pages);
  return Array.from(expandIds);
};

export const usePageExpandManager = (pageId?: any) => {
  const [expandedPages, setExpandedPages] = useAtom(expandedPagesAtom);
  const isExpanded = pageId ? includes(expandedPages, pageId) : false;

  const toggleExpanded = useCallback(() => {
    setExpandedPages((prev) => (isExpanded ? filter(prev, (id) => id !== pageId) : [...prev, pageId]));
  }, [setExpandedPages, isExpanded, pageId]);

  const updateForSelectedPage = useCallback(
    (pages: any[], currentPage: string) => {
      if (!currentPage || isEmpty(pages)) return;

      // * find list of pages here
      const flattenPages = flatByChildren(pages);
      const selectedPagePath = getParentPagesIds(flattenPages, currentPage);

      if (!Array.isArray(selectedPagePath) || isEmpty(selectedPagePath)) return;

      // Remove the selected page itself from the path (only expand parents)
      const parentPages = selectedPagePath.slice(0, -1);

      if (!isEmpty(parentPages)) {
        setExpandedPages((prev) => uniq([...prev, ...parentPages]));
      }
    },
    [setExpandedPages],
  );

  const expandPagesOnSearch = useCallback(
    (pages: any[]) => {
      if (isEmpty(pages)) return;

      const pagesToExpand = findPagesToExpandOnSearch(pages);
      if (!isEmpty(pagesToExpand)) {
        setExpandedPages((prev) => union(prev, pagesToExpand));
      }
    },
    [setExpandedPages],
  );

  const expandAll = useCallback(
    (pages: any[]) => {
      if (isEmpty(pages)) return;
      const allIds = flatMap(pages, (page) => {
        const getAllIds = (node: any): string[] => {
          return [node.id, ...(node.children ? flatMap(node.children, getAllIds) : [])];
        };
        return getAllIds(page);
      });
      setExpandedPages(allIds);
    },
    [setExpandedPages],
  );

  const collapseAll = useCallback(() => {
    setExpandedPages([]);
  }, [setExpandedPages]);

  return {
    isExpanded,
    toggleExpanded,
    updateForSelectedPage,
    expandedPages,
    expandPagesOnSearch,
    setExpandedPages,
    expandAll,
    collapseAll,
  };
};
