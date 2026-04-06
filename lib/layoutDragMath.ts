import type { LayoutElementRect } from "@/types/banner";

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
