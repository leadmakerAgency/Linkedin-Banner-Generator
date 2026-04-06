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
  /** Min inset from banner edges for the whole phone row (icon + number). */
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

/** Shift a 1D interval [min, max] into [lo, hi] without changing its width; prefers fixing left overflow then right. */
const fitInterval1D = (min: number, max: number, lo: number, hi: number): number => {
  if (max - min > hi - lo) {
    return lo - min;
  }
  let shift = lo - min;
  if (max + shift > hi) {
    shift = hi - max;
  }
  return shift;
};

/**
 * Single source of truth for phone icon + number placement in export coordinates.
 * - Icon stays left of the number with a minimum gap when there is room.
 * - The row is translated as one rigid group to stay inside the banner. Per-layer
 *   edge clamping is avoided so dragging never decouples the icon from the digits.
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
    phoneLeft = p.phoneRightX - phoneW;
    phoneTop = Math.round(p.phoneRowCenterY - phoneH / 2);
  }

  const anchorLeft = text ? phoneLeft : p.phoneRightX;
  let iconX = anchorLeft - p.gapBetweenIconAndText - p.iconSize + p.phoneIconOffsetX;
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

  let minL: number;
  let minT: number;
  let maxR: number;
  let maxB: number;

  if (text) {
    minL = Math.min(iconX, phoneLeft);
    minT = Math.min(iconY, phoneTop);
    maxR = Math.max(iconX + p.iconSize, phoneLeft + phoneW);
    maxB = Math.max(iconY + p.iconSize, phoneTop + phoneH);
  } else {
    minL = iconX;
    minT = iconY;
    maxR = iconX + p.iconSize;
    maxB = iconY + p.iconSize;
  }

  const xLo = edge;
  const xHi = bw - edge;
  const yLo = edge;
  const yHi = bh - edge;

  const shiftX = fitInterval1D(minL, maxR, xLo, xHi);
  const shiftY = fitInterval1D(minT, maxB, yLo, yHi);

  iconX = Math.round(iconX + shiftX);
  iconY = Math.round(iconY + shiftY);
  if (text) {
    phoneLeft = Math.round(phoneLeft + shiftX);
    phoneTop = Math.round(phoneTop + shiftY);
  }

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
