export function pageDetailsCacheKey(appId: string, pageId: string): string[] {
  return [`page-details-${appId}-${pageId}`];
}

export function pageDetailsCacheTags(pageId: string): string[] {
  return [`page-${pageId}`, `page-details-${pageId}`];
}

export function pageDetailsTagsForMutation(pageId: string): string[] {
  return [`page-${pageId}`];
}
