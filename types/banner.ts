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
  companyNameColorMode: CompanyNameColorMode;
  companyNameTextColor: string;
  companyDescriptionColorMode: CompanyNameColorMode;
  companyDescriptionTextColor: string;
  companyPageType: CompanyPageType;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  phoneNumber: string;
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
