import { getBannerDimensions, BannerType, PhonePlacement } from "@/types/banner";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BannerTemplateRules {
  dimensions: {
    width: number;
    height: number;
  };
  safeZone: Rect;
  contentArea: Rect;
  logoSlot: {
    maxWidth: number;
    maxHeight: number;
    gap: number;
  };
  phonePlacement: PhonePlacement;
}

const scale = (value: number, from: number, to: number) => Math.round((value * to) / from);

export const getTemplateRules = (bannerType: BannerType): BannerTemplateRules => {
  const { width: w, height: h } = getBannerDimensions(bannerType);

  if (bannerType === "personal") {
    return {
      dimensions: { width: w, height: h },
      safeZone: { x: 0, y: 0, width: 360, height: h },
      contentArea: { x: 390, y: 34, width: 1160, height: 328 },
      logoSlot: {
        maxWidth: 230,
        maxHeight: 100,
        gap: 18
      },
      phonePlacement: "bottom-right"
    };
  }

  const refW = 1584;
  const refH = 396;
  return {
    dimensions: { width: w, height: h },
    safeZone: { x: 0, y: 0, width: 0, height: h },
    contentArea: {
      x: scale(72, refW, w),
      y: scale(34, refH, h),
      width: Math.min(scale(1440, refW, w), w - scale(72, refW, w) - 16),
      height: Math.min(scale(328, refH, h), h - scale(34, refH, h))
    },
    logoSlot: {
      maxWidth: Math.max(120, scale(250, refW, w)),
      maxHeight: Math.max(48, scale(104, refH, h)),
      gap: Math.max(10, scale(18, refW, w))
    },
    phonePlacement: "bottom-right"
  };
};
