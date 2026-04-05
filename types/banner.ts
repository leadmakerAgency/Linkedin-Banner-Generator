export const BANNER_WIDTH = 1584;
export const BANNER_HEIGHT = 396;

export type BannerType = "personal" | "corporate";
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
  /** Pixels to nudge only the phone handset icon (number stays fixed); positive X = right, positive Y = down. */
  phoneIconOffsetX: number;
  phoneIconOffsetY: number;
  /** Draggable layout: added to default primary logo top-left (banner px). */
  layoutPrimaryLogoDeltaX: number;
  layoutPrimaryLogoDeltaY: number;
  /** Draggable layout: added to default secondary logo position. */
  layoutSecondaryLogoDeltaX: number;
  layoutSecondaryLogoDeltaY: number;
  /** Draggable layout: shifts company name + description lines together. */
  layoutTextBlockDeltaX: number;
  layoutTextBlockDeltaY: number;
  /** Draggable layout: shifts phone icon + number together. */
  layoutPhoneGroupDeltaX: number;
  layoutPhoneGroupDeltaY: number;
  stylePreset: StylePresetId;
  imageModel: ImageModelId;
}

export interface BannerGenerationInput extends BannerFormValues {
  revisionAction?: RevisionAction;
  regenerateNonce?: string;
}

export interface GenerateResponse {
  imageUrl: string;
  filename: string;
}

/** Client workflow: GPT background first, then editable overlay (no GPT on overlay edits). */
export type GenerationStage = "idle" | "generatingBackground" | "editingOverlay" | "exporting";
