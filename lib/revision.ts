import { BannerTemplateRules } from "@/lib/templateRules";
import { RevisionAction } from "@/types/banner";

export interface RevisionPatch {
  contentShiftX: number;
  promptDelta?: string;
  logoScale: number;
  reduceClutter: boolean;
}

const BASE_PATCH: RevisionPatch = {
  contentShiftX: 0,
  logoScale: 1,
  reduceClutter: false
};

export const getRevisionPatch = (action?: RevisionAction): RevisionPatch => {
  if (!action) {
    return BASE_PATCH;
  }

  switch (action) {
    case "move-left":
      return {
        ...BASE_PATCH,
        contentShiftX: -48,
        promptDelta: "shift the visual focal cluster and main text block slightly to the left while preserving readability"
      };
    case "more-premium":
      return {
        ...BASE_PATCH,
        promptDelta: "premium luxury polish, subtle premium lighting, richer depth"
      };
    case "reduce-clutter":
      return { ...BASE_PATCH, reduceClutter: true };
    case "make-logo-bigger":
      return {
        ...BASE_PATCH,
        logoScale: 1.2,
        promptDelta: "increase logo prominence and size compared with previous variant"
      };
    case "change-phone-placement":
      return {
        ...BASE_PATCH,
        promptDelta: "keep the phone number in the bottom-right corner and improve readability/contrast"
      };
    default:
      return BASE_PATCH;
  }
};

export const withRevisionContentArea = (
  rules: BannerTemplateRules,
  patch: RevisionPatch
): BannerTemplateRules => {
  const shiftedX = Math.max(rules.safeZone.x + rules.safeZone.width + 8, rules.contentArea.x + patch.contentShiftX);

  return {
    ...rules,
    contentArea: {
      ...rules.contentArea,
      x: shiftedX
    }
  };
};
