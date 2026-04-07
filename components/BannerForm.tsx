"use client";

import {
  BannerFormValues,
  BannerType,
  CompanyPageType,
  FontWeightId,
  StylePresetId,
  FontStyleId,
  FONT_SIZE_LIMITS,
  getBannerDimensions
} from "@/types/banner";

export interface BannerFiles {
  primaryLogo: File | null;
  secondaryLogo: File | null;
}

interface BannerFormProps {
  values: BannerFormValues;
  files: BannerFiles;
  embedded?: boolean;
  onValuesChange: (nextValues: BannerFormValues) => void;
  onFilesChange: (nextFiles: BannerFiles) => void;
}

const bannerTypes: Array<{ value: BannerType; label: string }> = [
  { value: "personal", label: "Personal LinkedIn Banner" },
  { value: "corporate", label: "Corporate LinkedIn Banner" }
];

const companyTypes: Array<{ value: CompanyPageType; label: string }> = [
  { value: "company", label: "Company" },
  { value: "agency", label: "Agency" },
  { value: "personal-brand", label: "Personal Brand" }
];

const stylePresets: Array<{ value: StylePresetId; label: string }> = [
  { value: "corporate", label: "Corporate" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "premium", label: "Premium" },
  { value: "elegant", label: "Elegant" },
  { value: "vibrant", label: "Vibrant" },
  { value: "dark-tech", label: "Dark Tech" },
  { value: "clean-light", label: "Clean Light" },
  { value: "gradient-wave", label: "Gradient Wave" }
];

const imageModels: Array<{ value: BannerFormValues["imageModel"]; label: string }> = [
  { value: "gpt-image-1", label: "GPT Image 1 (quality)" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (faster)" }
];

const fontWeights: Array<{ value: FontWeightId; label: string }> = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semibold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extrabold (800)" }
];

const fontStyles: Array<{ value: FontStyleId; label: string; previewClassName: string }> = [
  { value: "inter", label: "Inter", previewClassName: "font-preview-inter" },
  { value: "poppins", label: "Poppins", previewClassName: "font-preview-poppins" },
  { value: "montserrat", label: "Montserrat", previewClassName: "font-preview-montserrat" },
  { value: "lato", label: "Lato", previewClassName: "font-preview-lato" },
  { value: "roboto", label: "Roboto", previewClassName: "font-preview-roboto" },
  { value: "openSans", label: "Open Sans", previewClassName: "font-preview-openSans" },
  { value: "nunito", label: "Nunito", previewClassName: "font-preview-nunito" },
  { value: "raleway", label: "Raleway", previewClassName: "font-preview-raleway" },
  { value: "oswald", label: "Oswald", previewClassName: "font-preview-oswald" },
  { value: "playfairDisplay", label: "Playfair Display", previewClassName: "font-preview-playfairDisplay" },
  { value: "merriweather", label: "Merriweather", previewClassName: "font-preview-merriweather" },
  { value: "ubuntu", label: "Ubuntu", previewClassName: "font-preview-ubuntu" },
  { value: "workSans", label: "Work Sans", previewClassName: "font-preview-workSans" },
  { value: "sourceSansPro", label: "Source Sans Pro", previewClassName: "font-preview-sourceSansPro" },
  { value: "manrope", label: "Manrope", previewClassName: "font-preview-manrope" },
  { value: "mulish", label: "Mulish", previewClassName: "font-preview-mulish" },
  { value: "quicksand", label: "Quicksand", previewClassName: "font-preview-quicksand" },
  { value: "ptSans", label: "PT Sans", previewClassName: "font-preview-ptSans" },
  { value: "dmSans", label: "DM Sans", previewClassName: "font-preview-dmSans" },
  { value: "libreBaskerville", label: "Libre Baskerville", previewClassName: "font-preview-libreBaskerville" }
];

export const BannerForm = ({
  values,
  files,
  embedded = false,
  onValuesChange,
  onFilesChange
}: BannerFormProps) => {
  const selectedCompanyNameFont = fontStyles.find((fontStyle) => fontStyle.value === values.companyNameFontStyle) ?? fontStyles[0];
  const selectedDescriptionFont =
    fontStyles.find((fontStyle) => fontStyle.value === values.companyDescriptionFontStyle) ?? fontStyles[0];

  const handleInputChange = (field: keyof BannerFormValues, value: string | number) => {
    onValuesChange({
      ...values,
      [field]: value
    });
  };

  const handleFileChange = (field: keyof BannerFiles, file: File | null) => {
    onFilesChange({
      ...files,
      [field]: file
    });
  };

  const exportDims = getBannerDimensions(values.bannerType);
  const fontLimits = FONT_SIZE_LIMITS[values.bannerType];

  return (
    <section
      className={embedded ? "p-0" : "rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_20px_45px_-30px_rgba(2,6,23,0.95)]"}
      aria-label="LinkedIn banner settings"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-100">Generator Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Configure brand, typography, and layout controls for {exportDims.width}×{exportDims.height}px export.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Banner Type
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.bannerType}
            onChange={(event) => handleInputChange("bannerType", event.target.value as BannerType)}
          >
            {bannerTypes.map((bannerType) => (
              <option key={bannerType.value} value={bannerType.value}>
                {bannerType.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Company/Page Type
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyPageType}
            onChange={(event) => handleInputChange("companyPageType", event.target.value)}
          >
            {companyTypes.map((companyType) => (
              <option key={companyType.value} value={companyType.value}>
                {companyType.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          Company Name
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyName}
            onChange={(event) => handleInputChange("companyName", event.target.value)}
            placeholder="LeadMaker Hub"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Company Name Font
          <div className="flex items-center gap-3">
            <select
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
              value={values.companyNameFontStyle}
              onChange={(event) => handleInputChange("companyNameFontStyle", event.target.value)}
            >
              {fontStyles.map((fontStyle) => (
                <option key={fontStyle.value} value={fontStyle.value}>
                  {fontStyle.label}
                </option>
              ))}
            </select>
            <span
              className={`${selectedCompanyNameFont.previewClassName} shrink-0 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200`}
              aria-label={`Company name font preview for ${selectedCompanyNameFont.label}`}
            >
              Aa Bb 123
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Company Name Font Size
          <input
            type="number"
            min={fontLimits.name.min}
            max={fontLimits.name.max}
            step={1}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyNameFontSize}
            onChange={(event) => handleInputChange("companyNameFontSize", Number(event.target.value))}
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          <span>Company Name Text Color</span>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
            <label className="inline-flex items-center gap-2 font-normal text-slate-300">
              <input
                type="radio"
                name="companyNameColorMode"
                value="auto"
                checked={values.companyNameColorMode === "auto"}
                onChange={(event) => handleInputChange("companyNameColorMode", event.target.value)}
              />
              Auto (AI / smart contrast)
            </label>
            <label className="inline-flex items-center gap-2 font-normal text-slate-300">
              <input
                type="radio"
                name="companyNameColorMode"
                value="manual"
                checked={values.companyNameColorMode === "manual"}
                onChange={(event) => handleInputChange("companyNameColorMode", event.target.value)}
              />
              Manual
            </label>
            <input
              type="color"
              className="h-10 w-16 cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 disabled:cursor-not-allowed disabled:opacity-60"
              value={values.companyNameTextColor}
              onChange={(event) => handleInputChange("companyNameTextColor", event.target.value)}
              disabled={values.companyNameColorMode !== "manual"}
              aria-label="Company name text color"
            />
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          Company Name Font Weight
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyNameFontWeight}
            onChange={(event) => handleInputChange("companyNameFontWeight", event.target.value as FontWeightId)}
          >
            {fontWeights.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          Company Description
          <textarea
            className="min-h-24 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyDescription}
            onChange={(event) => handleInputChange("companyDescription", event.target.value)}
            placeholder="Lead Generation through strategic marketing campaigns, virtual assistants, and call centers in the Philippines and beyond."
            maxLength={80}
          />
          <span className="text-xs font-normal text-slate-400">{values.companyDescription.length}/80</span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Description Font
          <div className="flex items-center gap-3">
            <select
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
              value={values.companyDescriptionFontStyle}
              onChange={(event) => handleInputChange("companyDescriptionFontStyle", event.target.value)}
            >
              {fontStyles.map((fontStyle) => (
                <option key={fontStyle.value} value={fontStyle.value}>
                  {fontStyle.label}
                </option>
              ))}
            </select>
            <span
              className={`${selectedDescriptionFont.previewClassName} shrink-0 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200`}
              aria-label={`Description font preview for ${selectedDescriptionFont.label}`}
            >
              Aa Bb 123
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Description Font Size
          <input
            type="number"
            min={fontLimits.desc.min}
            max={fontLimits.desc.max}
            step={1}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyDescriptionFontSize}
            onChange={(event) => handleInputChange("companyDescriptionFontSize", Number(event.target.value))}
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          <span>Company Description Text Color</span>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
            <label className="inline-flex items-center gap-2 font-normal text-slate-300">
              <input
                type="radio"
                name="companyDescriptionColorMode"
                value="auto"
                checked={values.companyDescriptionColorMode === "auto"}
                onChange={(event) => handleInputChange("companyDescriptionColorMode", event.target.value)}
              />
              Auto (AI / smart contrast)
            </label>
            <label className="inline-flex items-center gap-2 font-normal text-slate-300">
              <input
                type="radio"
                name="companyDescriptionColorMode"
                value="manual"
                checked={values.companyDescriptionColorMode === "manual"}
                onChange={(event) => handleInputChange("companyDescriptionColorMode", event.target.value)}
              />
              Manual
            </label>
            <input
              type="color"
              className="h-10 w-16 cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 disabled:cursor-not-allowed disabled:opacity-60"
              value={values.companyDescriptionTextColor}
              onChange={(event) => handleInputChange("companyDescriptionTextColor", event.target.value)}
              disabled={values.companyDescriptionColorMode !== "manual"}
              aria-label="Company description text color"
            />
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          Description Font Weight
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.companyDescriptionFontWeight}
            onChange={(event) => handleInputChange("companyDescriptionFontWeight", event.target.value as FontWeightId)}
          >
            {fontWeights.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Primary Brand Color
          <input
            type="color"
            className="h-11 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70"
            value={values.primaryBrandColor}
            onChange={(event) => handleInputChange("primaryBrandColor", event.target.value)}
            aria-label="Primary brand color"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Secondary Brand Color
          <input
            type="color"
            className="h-11 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70"
            value={values.secondaryBrandColor}
            onChange={(event) => handleInputChange("secondaryBrandColor", event.target.value)}
            aria-label="Secondary brand color"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Phone Number
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.phoneNumber}
            onChange={(event) => handleInputChange("phoneNumber", event.target.value)}
            placeholder="+1 555 010 234"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Phone icon offset X (px)
          <input
            type="number"
            min={-400}
            max={400}
            step={1}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.phoneIconOffsetX}
            onChange={(event) => handleInputChange("phoneIconOffsetX", Number(event.target.value))}
            aria-describedby="phone-offset-x-hint"
          />
          <span id="phone-offset-x-hint" className="text-xs font-normal text-slate-500">
            Nudges only the handset icon; positive = right, negative = left. The number stays fixed; horizontal nudge is capped so the icon does not tuck under the digits.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Phone icon offset Y (px)
          <input
            type="number"
            min={-200}
            max={200}
            step={1}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.phoneIconOffsetY}
            onChange={(event) => handleInputChange("phoneIconOffsetY", Number(event.target.value))}
            aria-describedby="phone-offset-y-hint"
          />
          <span id="phone-offset-y-hint" className="text-xs font-normal text-slate-500">
            Nudges only the icon; positive = down, negative = up.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Style Preset
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.stylePreset}
            onChange={(event) => handleInputChange("stylePreset", event.target.value)}
          >
            {stylePresets.map((stylePreset) => (
              <option key={stylePreset.value} value={stylePreset.value}>
                {stylePreset.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300 md:col-span-2">
          Image Model
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-200 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
            value={values.imageModel}
            onChange={(event) => handleInputChange("imageModel", event.target.value)}
          >
            {imageModels.map((imageModel) => (
              <option key={imageModel.value} value={imageModel.value}>
                {imageModel.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Primary Logo (Optional)
          <input
            type="file"
            accept="image/*"
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-200"
            onChange={(event) => handleFileChange("primaryLogo", event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Secondary Logo (Optional)
          <input
            type="file"
            accept="image/*"
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-200"
            onChange={(event) => handleFileChange("secondaryLogo", event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

    </section>
  );
};
