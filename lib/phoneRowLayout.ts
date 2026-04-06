import type { LayoutElementRect } from "@/types/banner";

/** Measured phone number text bitmap (export space). */
export type PhoneTextMetrics = {
  width: number;
  height: number;
};

export type PhoneRowLayoutParams = {
  bannerWidth: number;
  bannerHeight: number;
  /** Right edge of the right-aligned phone number (export px). */
  phoneRightX: number;
  /** Vertical center of the phone row (export px). */
  phoneRowCenterY: number;
  phoneText: PhoneTextMetrics | null;
  iconSize: number;
  gapBetweenIconAndText: number;
  phoneIconOffsetX: number;
  phoneIconOffsetY: number;
  /** Min inset from banner edges for the icon. */
  edgeInset: number;
};

export type PhoneRowLayoutResult = {
  phoneLeft: number;
  phoneTop: number;
  phoneW: number;
  phoneH: number;
  iconX: number;
  iconY: number;
  iconRect: LayoutElementRect;
  textRect: LayoutElementRect | null;
};

/**
 * Single source of truth for phone icon + number placement in export coordinates.
 * - Icon is kept to the left of the number with a minimum gap (flex-style row).
 * - Positions are clamped to the banner; icon is not allowed to sit under the text bbox
 *   horizontally so composition and hit-testing stay predictable.
 */
export const computePhoneRowLayout = (p: PhoneRowLayoutParams): PhoneRowLayoutResult => {
  const { bannerWidth: bw, bannerHeight: bh, edgeInset: edge } = p;
  const text = p.phoneText;

  let phoneLeft = 0;
  let phoneTop = 0;
  let phoneW = 0;
  let phoneH = 0;

  if (text) {
    phoneW = text.width;
    phoneH = text.height;
    phoneLeft = Math.max(0, p.phoneRightX - phoneW);
    phoneTop = Math.max(0, Math.round(p.phoneRowCenterY - phoneH / 2));
  }

  const anchorLeft = text ? phoneLeft : p.phoneRightX;
  const baseIconX = anchorLeft - p.gapBetweenIconAndText - p.iconSize;
  let iconX = baseIconX + p.phoneIconOffsetX;
  let iconY = Math.round(p.phoneRowCenterY - p.iconSize / 2) + p.phoneIconOffsetY;

  if (!text) {
    iconX = p.phoneRightX - p.iconSize + p.phoneIconOffsetX;
  }

  if (text) {
    const maxIconXNoOverlap = phoneLeft - p.gapBetweenIconAndText - p.iconSize;
    if (maxIconXNoOverlap >= edge) {
      iconX = Math.min(iconX, maxIconXNoOverlap);
    }
  }

  iconX = Math.min(bw - p.iconSize - edge, Math.max(edge, iconX));
  iconY = Math.min(bh - p.iconSize - edge, Math.max(edge, iconY));

  const iconRect: LayoutElementRect = {
    left: iconX,
    top: iconY,
    width: p.iconSize,
    height: p.iconSize
  };

  const textRect: LayoutElementRect | null = text
    ? { left: phoneLeft, top: phoneTop, width: phoneW, height: phoneH }
    : null;

  return {
    phoneLeft,
    phoneTop,
    phoneW,
    phoneH,
    iconX,
    iconY,
    iconRect,
    textRect
  };
};
