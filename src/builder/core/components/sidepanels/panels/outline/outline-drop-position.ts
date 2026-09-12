export type OutlineDropPosition = "before" | "after" | "inside";

export const getOutlineDropPosition = (
  pointerY: number,
  { top, height }: Pick<DOMRect, "top" | "height">,
  canDropInside: boolean,
): OutlineDropPosition => {
  const relativePosition = (pointerY - top) / height;

  if (canDropInside && relativePosition >= 0.25 && relativePosition <= 0.75) return "inside";
  return relativePosition < 0.5 ? "before" : "after";
};
