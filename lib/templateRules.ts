import { BANNER_HEIGHT, BANNER_WIDTH, BannerType, PhonePlacement } from "@/types/banner";

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

const PERSONAL_RULES: BannerTemplateRules = {
  dimensions: { width: BANNER_WIDTH, height: BANNER_HEIGHT },
  safeZone: { x: 0, y: 0, width: 360, height: BANNER_HEIGHT },
  contentArea: { x: 390, y: 34, width: 1160, height: 328 },
  logoSlot: {
    maxWidth: 230,
    maxHeight: 100,
    gap: 18
  },
  phonePlacement: "bottom-right"
};

const CORPORATE_RULES: BannerTemplateRules = {
  dimensions: { width: BANNER_WIDTH, height: BANNER_HEIGHT },
  safeZone: { x: 0, y: 0, width: 0, height: BANNER_HEIGHT },
  contentArea: { x: 72, y: 34, width: 1440, height: 328 },
  logoSlot: {
    maxWidth: 250,
    maxHeight: 104,
    gap: 18
  },
  phonePlacement: "bottom-right"
};

export const getTemplateRules = (bannerType: BannerType): BannerTemplateRules => {
  return bannerType === "personal" ? PERSONAL_RULES : CORPORATE_RULES;
};
