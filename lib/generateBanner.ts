import { z } from "zod";
import { resolveBackgroundImageBuffer } from "@/lib/backgroundSource";
import { getBannerLayoutConstants } from "@/lib/bannerLayoutConstants";
import { renderTextRaster } from "@/lib/overlayText";
import { generateCreativeBaseImage } from "@/lib/openai";
import { buildStructuredPrompt } from "@/lib/promptBuilder";
import { measureSquareSvgVerticalVisualBiasPx } from "@/lib/measureSvgAlphaVisualBias";
import { computePhoneRowLayout } from "@/lib/phoneRowLayout";
import { isBannerAssetStoragePath } from "@/lib/bannerAssetPath";
import { getRevisionPatch } from "@/lib/revision";
import { saveOutputPng } from "@/lib/storage";
import {
  BannerGenerationInput,
  BannerType,
  CompanyPageType,
  FONT_SIZE_LIMITS,
  getBannerDimensions,
  LayoutElementRect,
  LayoutOverlayPayload,
  PHONE_ICON_SIZE_LIMITS,
  PHONE_NUMBER_FONT_SIZE_LIMITS,
  RevisionAction,
  StylePresetId
} from "@/types/banner";
import sharp from "sharp";

const layoutDeltaField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? 0 : val),
  z.coerce.number().int().min(-20000).max(20000)
);
const logoScaleField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? 100 : val),
  z.coerce.number().int().min(25).max(400)
);
const phoneNumberFontSizeField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? 22 : val),
  z.coerce.number().int().min(PHONE_NUMBER_FONT_SIZE_LIMITS.min).max(PHONE_NUMBER_FONT_SIZE_LIMITS.max)
);
const phoneIconSizeField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? 30 : val),
  z.coerce.number().int().min(PHONE_ICON_SIZE_LIMITS.min).max(PHONE_ICON_SIZE_LIMITS.max)
);
const showPhoneIconField = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val === "true" || val === "1") {
      return true;
    }
    if (val === "false" || val === "0") {
      return false;
    }
    if (val.trim() === "") {
      return true;
    }
  }
  return val;
}, z.coerce.boolean());

const generationSchema = z
  .object({
  bannerType: z.enum(["personal", "corporate"]),
  companyName: z.string().trim().max(80),
  companyDescription: z.string().trim().max(80),
  companyNameFontStyle: z.enum([
    "inter",
    "poppins",
    "montserrat",
    "lato",
    "roboto",
    "openSans",
    "nunito",
    "raleway",
    "oswald",
    "playfairDisplay",
    "merriweather",
    "ubuntu",
    "workSans",
    "sourceSansPro",
    "manrope",
    "mulish",
    "quicksand",
    "ptSans",
    "dmSans",
    "libreBaskerville"
  ]),
  companyDescriptionFontStyle: z.enum([
    "inter",
    "poppins",
    "montserrat",
    "lato",
    "roboto",
    "openSans",
    "nunito",
    "raleway",
    "oswald",
    "playfairDisplay",
    "merriweather",
    "ubuntu",
    "workSans",
    "sourceSansPro",
    "manrope",
    "mulish",
    "quicksand",
    "ptSans",
    "dmSans",
    "libreBaskerville"
  ]),
  companyNameFontSize: z.coerce.number().int(),
  companyDescriptionFontSize: z.coerce.number().int(),
  companyNameFontWeight: z.enum(["300", "400", "500", "600", "700", "800"]),
  companyDescriptionFontWeight: z.enum(["300", "400", "500", "600", "700", "800"]),
  companyNameColorMode: z.enum(["auto", "manual"]),
  companyNameTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  companyDescriptionColorMode: z.enum(["auto", "manual"]),
  companyDescriptionTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  companyPageType: z.enum(["company", "agency", "personal-brand"]),
  primaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  secondaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  phoneNumber: z.string().trim().max(40),
  phoneNumberFontSizePx: phoneNumberFontSizeField,
  phoneIconSizePx: phoneIconSizeField,
  showPhoneIcon: showPhoneIconField,
  phoneIconOffsetX: z.coerce.number().int().min(-400).max(400),
  phoneIconOffsetY: z.coerce.number().int().min(-200).max(200),
  layoutPrimaryLogoDeltaX: layoutDeltaField,
  layoutPrimaryLogoDeltaY: layoutDeltaField,
  layoutPrimaryLogoScalePct: logoScaleField,
  layoutSecondaryLogoDeltaX: layoutDeltaField,
  layoutSecondaryLogoDeltaY: layoutDeltaField,
  layoutSecondaryLogoScalePct: logoScaleField,
  layoutTextBlockDeltaX: layoutDeltaField,
  layoutTextBlockDeltaY: layoutDeltaField,
  layoutPhoneGroupDeltaX: layoutDeltaField,
  layoutPhoneGroupDeltaY: layoutDeltaField,
  imageModel: z.enum(["gpt-image-1", "gpt-image-1-mini"]),
  stylePreset: z.enum([
    "corporate",
    "corporate-2",
    "modern",
    "minimal",
    "bold",
    "premium",
    "elegant",
    "vibrant",
    "dark-tech",
    "clean-light",
    "gradient-wave"
  ]),
  stylePromptVariantIndex: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? 0 : val),
    z.coerce.number().int().min(0).max(4)
  )
})
  .superRefine((data, ctx) => {
    const lim = FONT_SIZE_LIMITS[data.bannerType];
    if (data.companyNameFontSize < lim.name.min || data.companyNameFontSize > lim.name.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Company name font size must be between ${lim.name.min} and ${lim.name.max}px for this banner type.`
      });
    }
    if (data.companyDescriptionFontSize < lim.desc.min || data.companyDescriptionFontSize > lim.desc.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Description font size must be between ${lim.desc.min} and ${lim.desc.max}px for this banner type.`
      });
    }
  });

const parseFormValue = (value: FormDataEntryValue | null): string => {
  return typeof value === "string" ? value : "";
};

const parseOptionalFile = (value: FormDataEntryValue | null): File | null => {
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return null;
};

const parseOptionalRevision = (value: FormDataEntryValue | null): RevisionAction | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const action = value as RevisionAction;
  const allowed: RevisionAction[] = [
    "move-left",
    "more-premium",
    "reduce-clutter",
    "make-logo-bigger",
    "change-phone-placement"
  ];

  return allowed.includes(action) ? action : undefined;
};

const parseOptionalString = (value: FormDataEntryValue | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export interface GeneratedBannerResult {
  filename: string;
  imageUrl: string;
  /** Present when the response includes a composed overlay (logos + text + phone). */
  layoutOverlay?: LayoutOverlayPayload;
}

const unionLayoutRects = (
  rects: LayoutElementRect[],
  padding: number,
  bannerWidth: number,
  bannerHeight: number
): LayoutElementRect => {
  if (rects.length === 0) {
    return { left: 0, top: 0, width: 1, height: 1 };
  }
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const r of rects) {
    minL = Math.min(minL, r.left);
    minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.left + r.width);
    maxB = Math.max(maxB, r.top + r.height);
  }
  const left = Math.max(0, minL - padding);
  const top = Math.max(0, minT - padding);
  const width = Math.min(bannerWidth - left, maxR - minL + padding * 2);
  const height = Math.min(bannerHeight - top, maxB - minT + padding * 2);
  return { left, top, width: Math.max(1, width), height: Math.max(1, height) };
};

/** Resize/crop AI output to banner size and remove transparency. */
export const normalizeBackgroundBuffer = async (
  buffer: Buffer,
  flattenColor: string,
  width: number,
  height: number
): Promise<Buffer> => {
  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "centre"
    })
    .flatten({ background: flattenColor })
    .png()
    .toBuffer();
};

/** Load background bytes from local `/generated/...` or a trusted Vercel Blob HTTPS URL. */
export const readBackgroundBufferFromPublicUrl = async (publicUrl: string): Promise<Buffer> => {
  return resolveBackgroundImageBuffer(publicUrl);
};

const resizeLogoBuffer = async (buffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> => {
  return sharp(buffer).resize({ width: maxWidth, height: maxHeight, fit: "inside" }).png().toBuffer();
};

const wrapTextLines = (text: string, maxLineLength: number, maxLines: number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const lastLine = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = lastLine.length > 3 ? `${lastLine.slice(0, Math.max(0, lastLine.length - 3))}...` : `${lastLine}...`;
  }

  return lines;
};

const getAverageLuminance = (pixels: Buffer): number => {
  if (pixels.length < 3) {
    return 0.5;
  }

  let luminanceSum = 0;
  let samples = 0;
  for (let index = 0; index <= pixels.length - 3; index += 3) {
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    luminanceSum += luminance;
    samples += 1;
  }

  return samples > 0 ? luminanceSum / samples : 0.5;
};

const resolveAutoContrastColor = async (
  bannerBuffer: Buffer,
  sampleArea: { left: number; top: number; width: number; height: number },
  bannerWidth: number,
  bannerHeight: number
): Promise<string> => {
  const sampleWidth = Math.max(
    24,
    Math.min(sampleArea.width, Math.max(1, bannerWidth - sampleArea.left))
  );
  const sampleHeight = Math.max(
    16,
    Math.min(sampleArea.height, Math.max(1, bannerHeight - sampleArea.top))
  );

  const sample = await sharp(bannerBuffer)
    .extract({
      left: Math.max(0, sampleArea.left),
      top: Math.max(0, sampleArea.top),
      width: sampleWidth,
      height: sampleHeight
    })
    .resize(48, 24, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const avgLuminance = getAverageLuminance(sample);
  if (avgLuminance >= 0.62) {
    return "#0F172A";
  }
  if (avgLuminance <= 0.28) {
    return "#F8FAFC";
  }
  return avgLuminance > 0.45 ? "#1E293B" : "#FFFFFF";
};

export const overlayBrandElements = async (
  bannerBuffer: Buffer,
  values: BannerGenerationInput,
  patchLogoScale: number,
  primaryLogo?: File | null,
  secondaryLogo?: File | null
): Promise<{ buffer: Buffer; layoutOverlay: LayoutOverlayPayload }> => {
  const { width: bw, height: bh } = getBannerDimensions(values.bannerType);
  const L = getBannerLayoutConstants(values.bannerType);
  const refW = 1584;
  const refH = 396;

  const primaryLogoScale = values.layoutPrimaryLogoScalePct / 100;
  const secondaryLogoScale = values.layoutSecondaryLogoScalePct / 100;
  const maxLogoWidth = Math.round(L.LAYOUT_PRIMARY_LOGO_BOX * patchLogoScale * primaryLogoScale);
  const maxLogoHeight = Math.round(L.LAYOUT_PRIMARY_LOGO_BOX * patchLogoScale * primaryLogoScale);
  const margin = L.LAYOUT_MARGIN;
  const logoTopLeft = L.LAYOUT_LOGO_TOP;
  const contentStartX = L.LAYOUT_CONTENT_START_X + values.layoutTextBlockDeltaX;
  const titleY = L.LAYOUT_TITLE_Y + values.layoutTextBlockDeltaY;

  const overlays: sharp.OverlayOptions[] = [];
  let primaryBuffer: Buffer | undefined;
  let primaryWidth = 0;
  let primaryHeight = 0;
  let secondaryBuffer: Buffer | undefined;
  let secondaryWidth = 0;
  let secondaryHeight = 0;

  if (primaryLogo) {
    primaryBuffer = await resizeLogoBuffer(Buffer.from(await primaryLogo.arrayBuffer()), maxLogoWidth, maxLogoHeight);
    const meta = await sharp(primaryBuffer).metadata();
    primaryWidth = meta.width ?? 0;
    primaryHeight = meta.height ?? 0;
  }

  if (secondaryLogo) {
    secondaryBuffer = await resizeLogoBuffer(
      Buffer.from(await secondaryLogo.arrayBuffer()),
      Math.round(L.LAYOUT_SECONDARY_LOGO_BOX * secondaryLogoScale),
      Math.round(L.LAYOUT_SECONDARY_LOGO_BOX * secondaryLogoScale)
    );
    const meta = await sharp(secondaryBuffer).metadata();
    secondaryWidth = meta.width ?? 0;
    secondaryHeight = meta.height ?? 0;
  }

  const primaryLeft = margin + values.layoutPrimaryLogoDeltaX;
  const primaryTop = logoTopLeft + values.layoutPrimaryLogoDeltaY;

  if (primaryBuffer && primaryWidth > 0) {
    overlays.push({
      input: primaryBuffer,
      left: primaryLeft,
      top: primaryTop
    });
  }

  const companyNameRaw = values.companyName.trim();
  const descMaxChars = Math.max(24, Math.round((62 * bw) / refW));
  const descriptionLines = wrapTextLines(values.companyDescription, descMaxChars, 2);
  const phoneRaw = values.phoneNumber.trim();
  const companyNameFontSize = values.companyNameFontSize;
  const companyDescriptionFontSize = values.companyDescriptionFontSize;
  const companyNameFontWeight = values.companyNameFontWeight;
  const companyDescriptionFontWeight = values.companyDescriptionFontWeight;
  const descriptionLineGap = Math.round(companyDescriptionFontSize * 1.25);
  const descriptionStartY = titleY + Math.round(companyNameFontSize * 0.54);
  const currentLeft = contentStartX;

  const nameSamplePad = Math.round((56 * bh) / refH);
  const autoNameColorSampleArea = {
    left: currentLeft,
    top: Math.max(0, titleY - nameSamplePad),
    width: Math.max(Math.round((220 * bw) / refW), bw - currentLeft - Math.round((160 * bw) / refW)),
    height: Math.max(32, Math.round((112 * bh) / refH))
  };
  const autoDescriptionColorSampleArea = {
    left: currentLeft,
    top: Math.max(0, descriptionStartY - companyDescriptionFontSize),
    width: Math.max(Math.round((220 * bw) / refW), bw - currentLeft - Math.round((180 * bw) / refW)),
    height: Math.max(28, Math.round((80 * bh) / refH))
  };
  const autoPhoneColorSampleArea = {
    left: Math.max(0, bw - Math.round((280 * bw) / refW)),
    top: Math.max(0, bh - Math.round((80 * bh) / refH)),
    width: Math.min(bw, Math.round((260 * bw) / refW)),
    height: Math.min(bh, Math.round((64 * bh) / refH))
  };
  const companyNameTextColor =
    values.companyNameColorMode === "manual"
      ? values.companyNameTextColor
      : await resolveAutoContrastColor(bannerBuffer, autoNameColorSampleArea, bw, bh);
  const descriptionTextColor =
    values.companyDescriptionColorMode === "manual"
      ? values.companyDescriptionTextColor
      : await resolveAutoContrastColor(bannerBuffer, autoDescriptionColorSampleArea, bw, bh);
  const phoneTextColor = await resolveAutoContrastColor(bannerBuffer, autoPhoneColorSampleArea, bw, bh);

  const textMaxWidth = Math.max(Math.round((180 * bw) / refW), bw - currentLeft - Math.round((140 * bw) / refW));

  const textRectsForUnion: LayoutElementRect[] = [];

  const nameRaster = await renderTextRaster({
    text: companyNameRaw,
    fontStyle: values.companyNameFontStyle,
    fontWeight: companyNameFontWeight,
    fontSizePx: companyNameFontSize,
    colorHex: companyNameTextColor,
    maxWidth: textMaxWidth,
    align: "left"
  });
  if (nameRaster) {
    const nameTop = Math.max(0, Math.round(titleY - companyNameFontSize * 0.72));
    overlays.push({ input: nameRaster.buffer, left: currentLeft, top: nameTop });
    textRectsForUnion.push({
      left: currentLeft,
      top: nameTop,
      width: nameRaster.width,
      height: nameRaster.height
    });
  }

  const line0 = descriptionLines[0] ?? "";
  const line1 = descriptionLines[1] ?? "";
  const desc0Raster = line0
    ? await renderTextRaster({
        text: line0,
        fontStyle: values.companyDescriptionFontStyle,
        fontWeight: companyDescriptionFontWeight,
        fontSizePx: companyDescriptionFontSize,
        colorHex: descriptionTextColor,
        maxWidth: textMaxWidth,
        align: "left"
      })
    : null;
  if (desc0Raster) {
    const top0 = Math.max(0, Math.round(descriptionStartY - companyDescriptionFontSize * 0.72));
    overlays.push({ input: desc0Raster.buffer, left: currentLeft, top: top0 });
    textRectsForUnion.push({
      left: currentLeft,
      top: top0,
      width: desc0Raster.width,
      height: desc0Raster.height
    });
  }

  const desc1Raster = line1
    ? await renderTextRaster({
        text: line1,
        fontStyle: values.companyDescriptionFontStyle,
        fontWeight: companyDescriptionFontWeight,
        fontSizePx: companyDescriptionFontSize,
        colorHex: descriptionTextColor,
        maxWidth: textMaxWidth,
        align: "left"
      })
    : null;
  if (desc1Raster) {
    const top1 = Math.max(0, Math.round(descriptionStartY + descriptionLineGap - companyDescriptionFontSize * 0.72));
    overlays.push({ input: desc1Raster.buffer, left: currentLeft, top: top1 });
    textRectsForUnion.push({
      left: currentLeft,
      top: top1,
      width: desc1Raster.width,
      height: desc1Raster.height
    });
  }

  const fallbackTextW = Math.min(textMaxWidth, Math.round((400 * bw) / refW));
  const textBlockRect =
    textRectsForUnion.length > 0
      ? unionLayoutRects(textRectsForUnion, 6, bw, bh)
      : ({
          left: currentLeft,
          top: Math.max(0, Math.round(titleY - companyNameFontSize * 0.72)),
          width: fallbackTextW,
          height: Math.round(companyNameFontSize + companyDescriptionFontSize * 2.8)
        } satisfies LayoutElementRect);

  const phoneFontSize = Math.max(
    PHONE_NUMBER_FONT_SIZE_LIMITS.min,
    Math.min(PHONE_NUMBER_FONT_SIZE_LIMITS.max, values.phoneNumberFontSizePx)
  );
  const iconSize = Math.max(PHONE_ICON_SIZE_LIMITS.min, Math.min(PHONE_ICON_SIZE_LIMITS.max, values.phoneIconSizePx));
  const shouldRenderPhoneIcon = values.showPhoneIcon;
  const iconGap = Math.max(4, Math.round((8 * bw) / refW));
  const phoneRightPad = Math.round((18 * bw) / refW);
  const phoneRowPad = Math.round((22 * bh) / refH);
  const phoneRightX = bw - phoneRightPad + values.layoutPhoneGroupDeltaX;
  const phoneRowCenterY = bh - phoneRowPad + values.layoutPhoneGroupDeltaY;
  const phoneLayoutEdgeInset = 2;
  const phoneTextRasterWidth = Math.max(1, bw - phoneLayoutEdgeInset * 2);

  let phoneGroupRect: LayoutElementRect | null = null;

  if (phoneRaw) {
    const phoneRaster = await renderTextRaster({
      text: phoneRaw,
      fontStyle: values.companyNameFontStyle,
      fontWeight: "500",
      fontSizePx: phoneFontSize,
      colorHex: phoneTextColor,
      maxWidth: phoneTextRasterWidth,
      align: "right",
      textWrap: "none"
    });

    const phoneIconSvg = shouldRenderPhoneIcon
      ? `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.25 4.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .72.53l.6 2.1a.75.75 0 0 1-.23.77l-1.05.87a11.04 11.04 0 0 0 5.28 5.28l.87-1.05a.75.75 0 0 1 .77-.23l2.1.6a.75.75 0 0 1 .53.72V15a.75.75 0 0 1-.75.75H12A9.75 9.75 0 0 1 2.25 6V4.5z" fill="${phoneTextColor}"/>
    </svg>
  `
      : "";

    const iconVisualBiasY = shouldRenderPhoneIcon
      ? await measureSquareSvgVerticalVisualBiasPx(phoneIconSvg, iconSize)
      : 0;

    const edge = phoneLayoutEdgeInset;
    const row = computePhoneRowLayout({
      bannerWidth: bw,
      bannerHeight: bh,
      phoneRightX,
      phoneRowCenterY,
      phoneText: phoneRaster ? { width: phoneRaster.width, height: phoneRaster.height } : null,
      iconSize: shouldRenderPhoneIcon ? iconSize : 0,
      gapBetweenIconAndText: shouldRenderPhoneIcon ? iconGap : 0,
      phoneIconOffsetX: values.phoneIconOffsetX,
      phoneIconOffsetY: values.phoneIconOffsetY,
      iconVisualBiasY,
      edgeInset: edge
    });

    if (phoneRaster) {
      overlays.push({ input: phoneRaster.buffer, left: row.phoneLeft, top: row.phoneTop });
    }

    if (shouldRenderPhoneIcon) {
      overlays.push({ input: Buffer.from(phoneIconSvg), left: row.iconX, top: row.iconY });
    }

    const phoneRects: LayoutElementRect[] = [];
    if (shouldRenderPhoneIcon) {
      phoneRects.push(row.iconRect);
    }
    if (row.textRect) {
      phoneRects.push(row.textRect);
    }
    if (phoneRects.length > 0) {
      phoneGroupRect = unionLayoutRects(phoneRects, 4, bw, bh);
    }
  }

  const secondaryLogoLeft =
    bw - secondaryWidth - L.LAYOUT_SECONDARY_LOGO_RIGHT_PAD + values.layoutSecondaryLogoDeltaX;
  const secondaryLogoTop = L.LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY;

  if (secondaryBuffer && secondaryWidth > 0) {
    overlays.push({ input: secondaryBuffer, left: secondaryLogoLeft, top: secondaryLogoTop });
  }

  const layoutOverlay: LayoutOverlayPayload = {
    primaryLogo:
      primaryBuffer && primaryWidth > 0 && primaryHeight > 0
        ? { left: primaryLeft, top: primaryTop, width: primaryWidth, height: primaryHeight }
        : null,
    secondaryLogo:
      secondaryBuffer && secondaryWidth > 0 && secondaryHeight > 0
        ? { left: secondaryLogoLeft, top: secondaryLogoTop, width: secondaryWidth, height: secondaryHeight }
        : null,
    textBlock: textBlockRect,
    phoneGroup: phoneGroupRect
  };

  const buffer = await sharp(bannerBuffer)
    .composite(overlays)
    .flatten({ background: values.secondaryBrandColor })
    .png()
    .toBuffer();

  return { buffer, layoutOverlay };
};

/** GPT image only; returns normalized PNG bytes (no persistence). */
export const buildBackgroundOnlyPngBuffer = async (
  values: BannerGenerationInput,
  primaryLogo?: File | null,
  secondaryLogo?: File | null
): Promise<Buffer> => {
  const patch = getRevisionPatch(values.revisionAction);
  void primaryLogo;
  void secondaryLogo;

  const prompt = buildStructuredPrompt({
    values,
    promptDelta: patch.promptDelta,
    reduceClutter: patch.reduceClutter
  });

  const { width, height } = getBannerDimensions(values.bannerType);
  const baseImageBuffer = await generateCreativeBaseImage(
    prompt,
    values.regenerateNonce,
    values.imageModel,
    width,
    height
  );
  return normalizeBackgroundBuffer(baseImageBuffer, values.secondaryBrandColor, width, height);
};

/** GPT image only; saved as PNG under public/generated or Blob/Supabase legacy path. Does not composite logos/text. */
export const runBackgroundOnlyGeneration = async (
  values: BannerGenerationInput,
  primaryLogo?: File | null,
  secondaryLogo?: File | null
): Promise<GeneratedBannerResult> => {
  const basePngBuffer = await buildBackgroundOnlyPngBuffer(values, primaryLogo, secondaryLogo);
  const stored = await saveOutputPng(basePngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl
  };
};

/** Deterministic logos + text + phone; does not persist. */
export const composeOverlayFromBannerBuffer = async (
  bannerBuffer: Buffer,
  values: BannerGenerationInput,
  primaryLogo: File | null,
  secondaryLogo: File | null
): Promise<{ pngBuffer: Buffer; layoutOverlay: LayoutOverlayPayload }> => {
  const patch = getRevisionPatch(undefined);
  const { buffer, layoutOverlay } = await overlayBrandElements(
    bannerBuffer,
    values,
    patch.logoScale,
    primaryLogo,
    secondaryLogo
  );
  return { pngBuffer: buffer, layoutOverlay };
};

/** Deterministic logos + text + phone; persists merged PNG via `saveOutputPng`. */
export const composeAndSaveOverlayFromBannerBuffer = async (
  bannerBuffer: Buffer,
  values: BannerGenerationInput,
  primaryLogo: File | null,
  secondaryLogo: File | null
): Promise<GeneratedBannerResult> => {
  const { pngBuffer, layoutOverlay } = await composeOverlayFromBannerBuffer(
    bannerBuffer,
    values,
    primaryLogo,
    secondaryLogo
  );
  const stored = await saveOutputPng(pngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl,
    layoutOverlay
  };
};

/** Deterministic logos + text + phone on top of an existing background asset. */
export const runOverlayRender = async (
  backgroundPublicUrl: string,
  values: BannerGenerationInput,
  primaryLogo: File | null,
  secondaryLogo: File | null
): Promise<GeneratedBannerResult> => {
  const buffer = await readBackgroundBufferFromPublicUrl(backgroundPublicUrl);
  return composeAndSaveOverlayFromBannerBuffer(buffer, values, primaryLogo, secondaryLogo);
};

const parsePromptSnapshot = (formData: FormData): string => {
  const raw = parseFormValue(formData.get("promptSnapshot"));
  return raw.length > 16000 ? raw.slice(0, 16000) : raw;
};

const parseOptionalDesignId = (formData: FormData): string | undefined => {
  const raw = parseFormValue(formData.get("designId")).trim();
  if (!raw) {
    return undefined;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    throw new Error("Invalid designId.");
  }
  return raw;
};

const parseOptionalBackgroundStoragePath = (formData: FormData): string | undefined => {
  const raw = parseFormValue(formData.get("backgroundStoragePath")).trim();
  if (!raw) {
    return undefined;
  }
  if (!isBannerAssetStoragePath(raw)) {
    throw new Error("Invalid backgroundStoragePath.");
  }
  return raw;
};

export const parseBannerInput = (formData: FormData): {
  values: BannerGenerationInput;
  primaryLogo: File | null;
  secondaryLogo: File | null;
  promptSnapshot: string;
  designId?: string;
  backgroundStoragePath?: string;
} => {
  const validation = generationSchema.safeParse({
    bannerType: parseFormValue(formData.get("bannerType")) as BannerType,
    companyName: parseFormValue(formData.get("companyName")),
    companyDescription: parseFormValue(formData.get("companyDescription")),
    companyNameFontStyle: parseFormValue(formData.get("companyNameFontStyle")) as BannerGenerationInput["companyNameFontStyle"],
    companyDescriptionFontStyle: parseFormValue(formData.get("companyDescriptionFontStyle")) as BannerGenerationInput["companyDescriptionFontStyle"],
    companyNameFontSize: parseFormValue(formData.get("companyNameFontSize")),
    companyDescriptionFontSize: parseFormValue(formData.get("companyDescriptionFontSize")),
    companyNameFontWeight: parseFormValue(formData.get("companyNameFontWeight")) as BannerGenerationInput["companyNameFontWeight"],
    companyDescriptionFontWeight: parseFormValue(formData.get("companyDescriptionFontWeight")) as BannerGenerationInput["companyDescriptionFontWeight"],
    companyNameColorMode: parseFormValue(formData.get("companyNameColorMode")) as BannerGenerationInput["companyNameColorMode"],
    companyNameTextColor: parseFormValue(formData.get("companyNameTextColor")),
    companyDescriptionColorMode: parseFormValue(
      formData.get("companyDescriptionColorMode")
    ) as BannerGenerationInput["companyDescriptionColorMode"],
    companyDescriptionTextColor: parseFormValue(formData.get("companyDescriptionTextColor")),
    companyPageType: parseFormValue(formData.get("companyPageType")) as CompanyPageType,
    primaryBrandColor: parseFormValue(formData.get("primaryBrandColor")),
    secondaryBrandColor: parseFormValue(formData.get("secondaryBrandColor")),
    phoneNumber: parseFormValue(formData.get("phoneNumber")),
    phoneNumberFontSizePx: parseFormValue(formData.get("phoneNumberFontSizePx")),
    phoneIconSizePx: parseFormValue(formData.get("phoneIconSizePx")),
    showPhoneIcon: parseFormValue(formData.get("showPhoneIcon")),
    phoneIconOffsetX: parseFormValue(formData.get("phoneIconOffsetX")),
    phoneIconOffsetY: parseFormValue(formData.get("phoneIconOffsetY")),
    layoutPrimaryLogoDeltaX: parseFormValue(formData.get("layoutPrimaryLogoDeltaX")),
    layoutPrimaryLogoDeltaY: parseFormValue(formData.get("layoutPrimaryLogoDeltaY")),
    layoutPrimaryLogoScalePct: parseFormValue(formData.get("layoutPrimaryLogoScalePct")),
    layoutSecondaryLogoDeltaX: parseFormValue(formData.get("layoutSecondaryLogoDeltaX")),
    layoutSecondaryLogoDeltaY: parseFormValue(formData.get("layoutSecondaryLogoDeltaY")),
    layoutSecondaryLogoScalePct: parseFormValue(formData.get("layoutSecondaryLogoScalePct")),
    layoutTextBlockDeltaX: parseFormValue(formData.get("layoutTextBlockDeltaX")),
    layoutTextBlockDeltaY: parseFormValue(formData.get("layoutTextBlockDeltaY")),
    layoutPhoneGroupDeltaX: parseFormValue(formData.get("layoutPhoneGroupDeltaX")),
    layoutPhoneGroupDeltaY: parseFormValue(formData.get("layoutPhoneGroupDeltaY")),
    imageModel: parseFormValue(formData.get("imageModel")) as BannerGenerationInput["imageModel"],
    stylePreset: parseFormValue(formData.get("stylePreset")) as StylePresetId,
    stylePromptVariantIndex: parseFormValue(formData.get("stylePromptVariantIndex"))
  });

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Invalid input.");
  }

  const primaryLogo = parseOptionalFile(formData.get("primaryLogo"));

  return {
    values: {
      ...validation.data,
      revisionAction: parseOptionalRevision(formData.get("revisionAction")),
      regenerateNonce: parseOptionalString(formData.get("regenerateNonce"))
    },
    primaryLogo,
    secondaryLogo: parseOptionalFile(formData.get("secondaryLogo")),
    promptSnapshot: parsePromptSnapshot(formData),
    designId: parseOptionalDesignId(formData),
    backgroundStoragePath: parseOptionalBackgroundStoragePath(formData)
  };
};

export const runBannerGeneration = async (
  values: BannerGenerationInput,
  primaryLogo: File | null,
  secondaryLogo?: File | null
): Promise<GeneratedBannerResult> => {
  const patch = getRevisionPatch(values.revisionAction);
  const logoHint = [
    primaryLogo
      ? "A primary logo file was uploaded and will be composited at the top-left corner by the app. Do not generate any logo yourself."
      : "",
    secondaryLogo ? "A secondary logo file was uploaded and will be composited in the top-right by the app. Do not generate fake logos." : ""
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = buildStructuredPrompt({
    values,
    promptDelta: [patch.promptDelta, logoHint].filter(Boolean).join(" "),
    reduceClutter: patch.reduceClutter
  });

  const { width, height } = getBannerDimensions(values.bannerType);
  const baseImageBuffer = await generateCreativeBaseImage(
    prompt,
    values.regenerateNonce,
    values.imageModel,
    width,
    height
  );
  const basePngBuffer = await normalizeBackgroundBuffer(baseImageBuffer, values.secondaryBrandColor, width, height);
  const { buffer: pngBuffer, layoutOverlay } = await overlayBrandElements(
    basePngBuffer,
    values,
    patch.logoScale,
    primaryLogo,
    secondaryLogo
  );

  const stored = await saveOutputPng(pngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl,
    layoutOverlay
  };
};
