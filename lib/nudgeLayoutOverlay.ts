import type { LayoutElementRect, LayoutOverlayPayload } from "@/types/banner";

export type LayoutDragGroup = "primary" | "secondary" | "text" | "phone";
export type LayoutResizeGroup = "primary" | "secondary";

const shift = (rect: LayoutElementRect, dx: number, dy: number): LayoutElementRect => ({
  ...rect,
  left: rect.left + dx,
  top: rect.top + dy
});

/** Optimistically move one hit region after a drag (banner px) until the next server render. */
export const nudgeLayoutOverlay = (
  previous: LayoutOverlayPayload | null,
  group: LayoutDragGroup,
  dx: number,
  dy: number
): LayoutOverlayPayload | null => {
  if (!previous) {
    return previous;
  }
  switch (group) {
    case "primary":
      return previous.primaryLogo
        ? { ...previous, primaryLogo: shift(previous.primaryLogo, dx, dy) }
        : previous;
    case "secondary":
      return previous.secondaryLogo
        ? { ...previous, secondaryLogo: shift(previous.secondaryLogo, dx, dy) }
        : previous;
    case "text":
      return { ...previous, textBlock: shift(previous.textBlock, dx, dy) };
    case "phone":
      return previous.phoneGroup
        ? { ...previous, phoneGroup: shift(previous.phoneGroup, dx, dy) }
        : previous;
    default:
      return previous;
  }
};

/** Optimistically resize logo hit regions until the next server render arrives. */
export const nudgeLayoutOverlayResize = (
  previous: LayoutOverlayPayload | null,
  group: LayoutResizeGroup,
  nextRect: LayoutElementRect
): LayoutOverlayPayload | null => {
  if (!previous) {
    return previous;
  }

  if (group === "primary") {
    return previous.primaryLogo ? { ...previous, primaryLogo: nextRect } : previous;
  }

  return previous.secondaryLogo ? { ...previous, secondaryLogo: nextRect } : previous;
};
