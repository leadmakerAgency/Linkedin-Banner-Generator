import {
  getBannerDimensions,
  PERSONAL_BANNER_HEIGHT,
  PERSONAL_BANNER_WIDTH,
  type BannerType
} from "@/types/banner";

/** Layout numbers shared by `overlayBrandElements` and `BannerLayoutEditor`. */
export type BannerLayoutConstants = {
  LAYOUT_MARGIN: number;
  LAYOUT_LOGO_TOP: number;
  LAYOUT_CONTENT_START_X: number;
  LAYOUT_TITLE_Y: number;
  LAYOUT_SECONDARY_LOGO_TOP: number;
  LAYOUT_SECONDARY_LOGO_RIGHT_PAD: number;
  LAYOUT_PRIMARY_LOGO_BOX: number;
  LAYOUT_SECONDARY_LOGO_BOX: number;
  LAYOUT_SECONDARY_LOGO_LEFT: number;
  LAYOUT_TEXT_BLOCK_WIDTH_RATIO: number;
  LAYOUT_PHONE_REGION_W: number;
  LAYOUT_PHONE_REGION_H: number;
  LAYOUT_PHONE_REGION_LEFT: number;
  LAYOUT_PHONE_REGION_TOP: number;
  LAYOUT_TEXT_BLOCK_LEFT: number;
  LAYOUT_TEXT_BLOCK_TOP: number;
  LAYOUT_TEXT_BLOCK_WIDTH: number;
  LAYOUT_TEXT_BLOCK_HEIGHT: number;
};

const buildPersonalLayout = (): BannerLayoutConstants => {
  const w = PERSONAL_BANNER_WIDTH;
  const h = PERSONAL_BANNER_HEIGHT;
  const margin = 20;
  const contentStartX = Math.round(w * 0.3) + 24;
  const titleY = Math.round(h * 0.46);
  const secondaryPad = 26;
  const primaryBox = 118;
  const secondaryBox = 96;
  const phoneW = 300;
  const phoneH = 64;
  const phonePadRight = 12;
  return {
    LAYOUT_MARGIN: margin,
    LAYOUT_LOGO_TOP: margin,
    LAYOUT_CONTENT_START_X: contentStartX,
    LAYOUT_TITLE_Y: titleY,
    LAYOUT_SECONDARY_LOGO_TOP: 24,
    LAYOUT_SECONDARY_LOGO_RIGHT_PAD: secondaryPad,
    LAYOUT_PRIMARY_LOGO_BOX: primaryBox,
    LAYOUT_SECONDARY_LOGO_BOX: secondaryBox,
    LAYOUT_SECONDARY_LOGO_LEFT: w - secondaryBox - secondaryPad,
    LAYOUT_TEXT_BLOCK_WIDTH_RATIO: 0.52,
    LAYOUT_PHONE_REGION_W: phoneW,
    LAYOUT_PHONE_REGION_H: phoneH,
    LAYOUT_PHONE_REGION_LEFT: w - phoneW - phonePadRight,
    LAYOUT_PHONE_REGION_TOP: h - phoneH - 8,
    LAYOUT_TEXT_BLOCK_LEFT: contentStartX,
    LAYOUT_TEXT_BLOCK_TOP: Math.round(titleY - 44),
    LAYOUT_TEXT_BLOCK_WIDTH: Math.round(w * 0.52),
    LAYOUT_TEXT_BLOCK_HEIGHT: Math.round(h * 0.44)
  };
};

const buildCorporateLayout = (): BannerLayoutConstants => {
  const { width: w, height: h } = getBannerDimensions("corporate");
  const margin = Math.max(10, Math.round((20 * h) / PERSONAL_BANNER_HEIGHT));
  const contentStartX = Math.round(w * 0.3) + Math.round((24 * w) / PERSONAL_BANNER_WIDTH);
  const titleY = Math.round(h * 0.46);
  const secondaryPad = Math.max(14, Math.round((26 * w) / PERSONAL_BANNER_WIDTH));
  const primaryBox = Math.max(42, Math.round((118 * h) / PERSONAL_BANNER_HEIGHT));
  const secondaryBox = Math.max(36, Math.round((96 * h) / PERSONAL_BANNER_HEIGHT));
  const phoneW = Math.min(Math.round((300 * w) / PERSONAL_BANNER_WIDTH), Math.floor(w * 0.42));
  const phoneH = Math.min(Math.round((64 * h) / PERSONAL_BANNER_HEIGHT), Math.floor(h * 0.24));
  const phonePadRight = Math.max(6, Math.round((12 * w) / PERSONAL_BANNER_WIDTH));
  const phonePadBottom = Math.max(4, Math.round((8 * h) / PERSONAL_BANNER_HEIGHT));
  const textTopOffset = Math.max(12, Math.round((44 * h) / PERSONAL_BANNER_HEIGHT));
  return {
    LAYOUT_MARGIN: margin,
    LAYOUT_LOGO_TOP: margin,
    LAYOUT_CONTENT_START_X: contentStartX,
    LAYOUT_TITLE_Y: titleY,
    LAYOUT_SECONDARY_LOGO_TOP: Math.max(8, Math.round((24 * h) / PERSONAL_BANNER_HEIGHT)),
    LAYOUT_SECONDARY_LOGO_RIGHT_PAD: secondaryPad,
    LAYOUT_PRIMARY_LOGO_BOX: primaryBox,
    LAYOUT_SECONDARY_LOGO_BOX: secondaryBox,
    LAYOUT_SECONDARY_LOGO_LEFT: w - secondaryBox - secondaryPad,
    LAYOUT_TEXT_BLOCK_WIDTH_RATIO: 0.52,
    LAYOUT_PHONE_REGION_W: phoneW,
    LAYOUT_PHONE_REGION_H: phoneH,
    LAYOUT_PHONE_REGION_LEFT: w - phoneW - phonePadRight,
    LAYOUT_PHONE_REGION_TOP: h - phoneH - phonePadBottom,
    LAYOUT_TEXT_BLOCK_LEFT: contentStartX,
    LAYOUT_TEXT_BLOCK_TOP: Math.round(titleY - textTopOffset),
    LAYOUT_TEXT_BLOCK_WIDTH: Math.round(w * 0.52),
    LAYOUT_TEXT_BLOCK_HEIGHT: Math.round(h * 0.44)
  };
};

const personalLayout = buildPersonalLayout();

export const getBannerLayoutConstants = (bannerType: BannerType): BannerLayoutConstants =>
  bannerType === "personal" ? personalLayout : buildCorporateLayout();
