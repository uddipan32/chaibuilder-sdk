import { autoUpdate, flip, offset, size } from "@floating-ui/dom";
import { shift, useFloating } from "@floating-ui/react-dom";
import { isFunction } from "lodash-es";
import { ReactNode, useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const SUGGESTIONS_MAX_HEIGHT = 220;
const SUGGESTIONS_MIN_HEIGHT = 96;

/**
 * The classes input sits inside an accordion (`overflow-hidden`) nested in the scrollable
 * settings panel, so an absolutely positioned dropdown gets clipped whatever its z-index.
 * Render it in a portal instead and position it with floating-ui.
 *
 * The target is the nearest dialog when there is one (the design tokens modal): a modal
 * disables pointer events outside itself, and a click on a suggestion would count as an
 * outside interaction and dismiss the dialog.
 */
export const getSuggestionsPortalTarget = (anchor: HTMLElement): HTMLElement =>
  (anchor.closest('[role="dialog"], [role="alertdialog"]') as HTMLElement | null) ?? anchor.ownerDocument.body;

type ContainerRef = ((node: HTMLDivElement | null) => void) | { current: HTMLDivElement | null } | null | undefined;

const assignContainerRef = (ref: ContainerRef, node: HTMLDivElement | null) => {
  if (isFunction(ref)) ref(node);
  else if (ref) ref.current = node;
};

const SUGGESTIONS_MIDDLEWARE = [
  offset(4),
  flip({ padding: 8 }),
  shift({ padding: 8 }),
  size({
    padding: 8,
    apply({ rects, availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        width: `${rects.reference.width}px`,
        maxHeight: `${Math.max(Math.min(SUGGESTIONS_MAX_HEIGHT, availableHeight), SUGGESTIONS_MIN_HEIGHT)}px`,
      });
    },
  }),
];

export function SuggestionsPortal({
  anchor,
  containerProps,
  children,
}: {
  anchor: HTMLElement | null;
  containerProps: Record<string, any>;
  children: ReactNode;
}) {
  // `key` and `ref` cannot be spread onto the div: React warns on a spread `key`, and the ref
  // has to be merged with floating-ui's.
  const { key: _key, ref: autosuggestRef, ...restContainerProps } = containerProps;

  // Own the portal host so the dropdown renders - and react-autosuggest captures its container
  // ref - on the very first render, before the anchor element is known. The host is moved into
  // the resolved target in a layout effect. `display: contents` keeps it out of the layout.
  const [portalNode] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const node = document.createElement("div");
    node.style.display = "contents";
    return node;
  });

  const {
    refs: { setFloating },
    floatingStyles,
  } = useFloating({
    placement: "bottom-start",
    strategy: "fixed",
    elements: { reference: anchor },
    // Only track while open: autoUpdate listens on every scrollable ancestor.
    whileElementsMounted: children ? autoUpdate : undefined,
    middleware: SUGGESTIONS_MIDDLEWARE,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setFloating(node);
      assignContainerRef(autosuggestRef, node);
    },
    [setFloating, autosuggestRef],
  );

  useLayoutEffect(() => {
    if (!portalNode || !anchor) return;
    getSuggestionsPortalTarget(anchor).appendChild(portalNode);
    return () => {
      portalNode.remove();
    };
  }, [portalNode, anchor]);

  if (!portalNode) return null;

  // Rendered even while closed so react-autosuggest can capture the container ref on mount.
  return createPortal(
    <div {...restContainerProps} ref={setRefs} style={floatingStyles}>
      {children}
    </div>,
    portalNode,
  );
}
