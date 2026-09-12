const GAP = 4;
const MARGIN = 8;

/**
 * Position a `position: fixed` popup against an anchor rect, flipping above when
 * there is no room below and clamping so it never spills past a viewport edge.
 * Used by the binding popups that cannot go through Radix Popover (tiptap `{{`
 * suggestions, the visibility-expression autocomplete).
 */
export const positionFixedPopup = (popup: HTMLElement, rect: DOMRect | null | undefined): void => {
  if (!rect) return;
  const popupHeight = popup.offsetHeight || 240;
  const popupWidth = popup.offsetWidth || 240;

  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow < popupHeight + MARGIN ? rect.top - popupHeight - GAP : rect.bottom + GAP;

  let left = rect.left;
  if (left + popupWidth > window.innerWidth - MARGIN) left = window.innerWidth - popupWidth - MARGIN;

  popup.style.left = `${Math.max(MARGIN, left)}px`;
  popup.style.top = `${Math.max(MARGIN, top)}px`;
};

/** Keep the active suggestion row visible inside its scrollable list. */
export const scrollSuggestionIntoView = (container: HTMLElement, item: HTMLElement): void => {
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  const visibleTop = container.scrollTop;
  const visibleBottom = visibleTop + container.clientHeight;

  if (itemTop < visibleTop) container.scrollTop = itemTop;
  else if (itemBottom > visibleBottom) container.scrollTop = itemBottom - container.clientHeight;
};
