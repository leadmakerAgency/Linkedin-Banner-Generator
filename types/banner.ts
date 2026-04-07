/** Personal profile cover (LinkedIn). */
export const PERSONAL_BANNER_WIDTH = 1584;
export const PERSONAL_BANNER_HEIGHT = 396;

/** Company page cover (LinkedIn). */
export const CORPORATE_BANNER_WIDTH = 1128;
export const CORPORATE_BANNER_HEIGHT = 191;

/** @deprecated Prefer getBannerDimensions — these are the personal profile dimensions. */
export const BANNER_WIDTH = PERSONAL_BANNER_WIDTH;
/** @deprecated Prefer getBannerDimensions — these are the personal profile dimensions. */
export const BANNER_HEIGHT = PERSONAL_BANNER_HEIGHT;

export type BannerType = "personal" | "corporate";

export type BannerDimensions = { width: number; height: number };

export const getBannerDimensions = (bannerType: BannerType): BannerDimensions =>
  bannerType === "personal"
    ? { width: PERSONAL_BANNER_WIDTH, height: PERSONAL_BANNER_HEIGHT }
    : { width: CORPORATE_BANNER_WIDTH, height: CORPORATE_BANNER_HEIGHT };

export type CompanyPageType = "company" | "agency" | "personal-brand";
export type StylePresetId =
  | "corporate"
  | "modern"
  | "minimal"
  | "bold"
  | "premium"
  | "elegant"
  | "vibrant"
  | "dark-tech"
  | "clean-light"
  | "gradient-wave";
export type ImageModelId = "gpt-image-1" | "gpt-image-1-mini";
export type FontStyleId =
  | "inter"
  | "poppins"
  | "montserrat"
  | "lato"
  | "roboto"
  | "openSans"
  | "nunito"
  | "raleway"
  | "oswald"
  | "playfairDisplay"
  | "merriweather"
  | "ubuntu"
  | "workSans"
  | "sourceSansPro"
  | "manrope"
  | "mulish"
  | "quicksand"
  | "ptSans"
  | "dmSans"
  | "libreBaskerville";
export type CompanyNameColorMode = "auto" | "manual";

/** Numeric CSS/SVG font-weight values (100–900). */
export type FontWeightId = "300" | "400" | "500" | "600" | "700" | "800";
export type RevisionAction =
  | "move-left"
  | "more-premium"
  | "reduce-clutter"
  | "make-logo-bigger"
  | "change-phone-placement";

export type PhonePlacement = "top-right" | "bottom-right";

export interface BannerFormValues {
  bannerType: BannerType;
  companyName: string;
  companyDescription: string;
  companyNameFontStyle: FontStyleId;
  companyDescriptionFontStyle: FontStyleId;
  companyNameFontSize: number;
  companyDescriptionFontSize: number;
  companyNameFontWeight: FontWeightId;
  companyDescriptionFontWeight: FontWeightId;
  companyNameColorMode: CompanyNameColorMode;
  companyNameTextColor: string;
  companyDescriptionColorMode: CompanyNameColorMode;
  companyDescriptionTextColor: string;
  companyPageType: CompanyPageType;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  phoneNumber: string;
  /** Pixels to nudge only the phone handset icon (number stays fixed); positive X = right, positive Y = down. Export clamps X so the icon stays left of the number with a gap. */
  phoneIconOffsetX: number;
  phoneIconOffsetY: number;
  /** Draggable layout: added to default primary logo top-left (banner px). */
  layoutPrimaryLogoDeltaX: number;
  layoutPrimaryLogoDeltaY: number;
  /** Scale percent applied to primary logo max box (100 = default size). */
  layoutPrimaryLogoScalePct: number;
  /** Draggable layout: added to default secondary logo position. */
  layoutSecondaryLogoDeltaX: number;
  layoutSecondaryLogoDeltaY: number;
  /** Scale percent applied to secondary logo max box (100 = default size). */
  layoutSecondaryLogoScalePct: number;
  /** Draggable layout: shifts company name + description lines together. */
  layoutTextBlockDeltaX: number;
  layoutTextBlockDeltaY: number;
  /** Draggable layout: shifts phone icon + number together. */
  layoutPhoneGroupDeltaX: number;
  layoutPhoneGroupDeltaY: number;
  stylePreset: StylePresetId;
  imageModel: ImageModelId;
}

/** Default font sizes when switching or resetting banner type. */
export const DEFAULT_TYPOGRAPHY_FOR_BANNER_TYPE: Record<
  BannerType,
  Pick<BannerFormValues, "companyNameFontSize" | "companyDescriptionFontSize">
> = {
  personal: { companyNameFontSize: 74, companyDescriptionFontSize: 24 },
  corporate: { companyNameFontSize: 36, companyDescriptionFontSize: 12 }
};

/** Validation and form input bounds per export format. */
export const FONT_SIZE_LIMITS: Record<
  BannerType,
  { name: { min: number; max: number }; desc: { min: number; max: number } }
> = {
  personal: { name: { min: 42, max: 108 }, desc: { min: 16, max: 40 } },
  corporate: { name: { min: 22, max: 56 }, desc: { min: 10, max: 22 } }
};

export interface BannerGenerationInput extends BannerFormValues {
  revisionAction?: RevisionAction;
  regenerateNonce?: string;
}

export interface GenerateResponse {
  imageUrl: string;
  filename: string;
}

/** Pixel bounds in export space for draggable handles (matches last server composite). */
export type LayoutElementRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LayoutOverlayPayload = {
  primaryLogo: LayoutElementRect | null;
  secondaryLogo: LayoutElementRect | null;
  textBlock: LayoutElementRect;
  phoneGroup: LayoutElementRect | null;
};

/** Client workflow: GPT background first, then editable overlay (no GPT on overlay edits). */
export type GenerationStage = "idle" | "generatingBackground" | "editingOverlay" | "exporting";
