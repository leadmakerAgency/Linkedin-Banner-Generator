import type { LayoutElementRect } from "@/types/banner";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export const getPreviewScale = (previewWidthPx: number, bannerWidthPx: number): number => {
  if (previewWidthPx <= 0 || bannerWidthPx <= 0) {
    return 1;
  }
  return previewWidthPx / bannerWidthPx;
};

export const toBannerDelta = (
  clientDxPx: number,
  clientDyPx: number,
  previewScale: number
): { dxBanner: number; dyBanner: number } => {
  if (previewScale <= 0) {
    return { dxBanner: 0, dyBanner: 0 };
  }
  return {
    dxBanner: Math.round(clientDxPx / previewScale),
    dyBanner: Math.round(clientDyPx / previewScale)
  };
};

export const clampRectWithinBanner = (
  rect: LayoutElementRect,
  dxBanner: number,
  dyBanner: number,
  bannerWidth: number,
  bannerHeight: number
): { dxBanner: number; dyBanner: number } => {
  const minDx = -rect.left;
  const maxDx = bannerWidth - (rect.left + rect.width);
  const minDy = -rect.top;
  const maxDy = bannerHeight - (rect.top + rect.height);

  return {
    dxBanner: Math.max(minDx, Math.min(maxDx, dxBanner)),
    dyBanner: Math.max(minDy, Math.min(maxDy, dyBanner))
  };
};

export const clampUniformScalePct = (value: number, minPct: number, maxPct: number): number => {
  return Math.max(minPct, Math.min(maxPct, value));
};

export const computeUniformResizeFromCorner = (
  startRect: LayoutElementRect,
  corner: ResizeCorner,
  dxBanner: number,
  dyBanner: number,
  startScalePct: number,
  minScalePct: number,
  maxScalePct: number,
  bannerWidth: number,
  bannerHeight: number
): { nextRect: LayoutElementRect; nextScalePct: number } => {
  const startW = Math.max(1, startRect.width);
  const startH = Math.max(1, startRect.height);
  const right = startRect.left + startW;
  const bottom = startRect.top + startH;

  const candidateScaleX =
    corner === "nw" || corner === "sw" ? (startW - dxBanner) / startW : (startW + dxBanner) / startW;
  const candidateScaleY =
    corner === "nw" || corner === "ne" ? (startH - dyBanner) / startH : (startH + dyBanner) / startH;
  const dominantScale =
    Math.abs(candidateScaleX - 1) >= Math.abs(candidateScaleY - 1) ? candidateScaleX : candidateScaleY;

  let boundedMaxScalePct = maxScalePct;
  switch (corner) {
    case "se": {
      const maxW = bannerWidth - startRect.left;
      const maxH = bannerHeight - startRect.top;
      boundedMaxScalePct = Math.min(maxScalePct, (startScalePct * Math.min(maxW / startW, maxH / startH)));
      break;
    }
    case "nw": {
      const maxW = right;
      const maxH = bottom;
      boundedMaxScalePct = Math.min(maxScalePct, (startScalePct * Math.min(maxW / startW, maxH / startH)));
      break;
    }
    case "ne": {
      const maxW = bannerWidth - startRect.left;
      const maxH = bottom;
      boundedMaxScalePct = Math.min(maxScalePct, (startScalePct * Math.min(maxW / startW, maxH / startH)));
      break;
    }
    case "sw": {
      const maxW = right;
      const maxH = bannerHeight - startRect.top;
      boundedMaxScalePct = Math.min(maxScalePct, (startScalePct * Math.min(maxW / startW, maxH / startH)));
      break;
    }
    default:
      boundedMaxScalePct = maxScalePct;
  }

  const nextScalePct = clampUniformScalePct(startScalePct * dominantScale, minScalePct, boundedMaxScalePct);
  const ratio = nextScalePct / startScalePct;
  const nextW = Math.max(1, Math.round(startW * ratio));
  const nextH = Math.max(1, Math.round(startH * ratio));

  let left = startRect.left;
  let top = startRect.top;

  if (corner === "nw" || corner === "sw") {
    left = right - nextW;
  }
  if (corner === "nw" || corner === "ne") {
    top = bottom - nextH;
  }

  return {
    nextRect: clampRectAfterResizeWithinBanner(
      { left, top, width: nextW, height: nextH },
      bannerWidth,
      bannerHeight
    ),
    nextScalePct
  };
};

export const clampRectAfterResizeWithinBanner = (
  rect: LayoutElementRect,
  bannerWidth: number,
  bannerHeight: number
): LayoutElementRect => {
  const width = Math.max(1, Math.min(rect.width, bannerWidth));
  const height = Math.max(1, Math.min(rect.height, bannerHeight));
  const left = Math.max(0, Math.min(rect.left, bannerWidth - width));
  const top = Math.max(0, Math.min(rect.top, bannerHeight - height));

  return {
    left,
    top,
    width,
    height
  };
};
