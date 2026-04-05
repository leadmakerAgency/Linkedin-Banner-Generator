import { z } from "zod";
import { resolveBackgroundImageBuffer } from "@/lib/backgroundSource";
import {
  LAYOUT_CONTENT_START_X,
  LAYOUT_LOGO_TOP,
  LAYOUT_MARGIN,
  LAYOUT_PRIMARY_LOGO_BOX,
  LAYOUT_SECONDARY_LOGO_BOX,
  LAYOUT_SECONDARY_LOGO_RIGHT_PAD,
  LAYOUT_SECONDARY_LOGO_TOP,
  LAYOUT_TITLE_Y
} from "@/lib/bannerLayoutConstants";
import { renderTextRaster } from "@/lib/overlayText";
import { generateCreativeBaseImage } from "@/lib/openai";
import { buildStructuredPrompt } from "@/lib/promptBuilder";
import { getRevisionPatch } from "@/lib/revision";
import { saveOutputPng } from "@/lib/storage";
import {
  BannerGenerationInput,
  BannerType,
  BANNER_HEIGHT,
  BANNER_WIDTH,
  CompanyPageType,
  LayoutElementRect,
  LayoutOverlayPayload,
  RevisionAction,
  StylePresetId
} from "@/types/banner";
import sharp from "sharp";

const layoutDeltaField = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? 0 : val),
  z.coerce.number().int().min(-400).max(400)
);

const generationSchema = z.object({
  bannerType: z.enum(["personal", "corporate"]),
  companyName: z.string().trim().min(2).max(80),
  companyDescription: z.string().trim().min(8).max(80),
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
  companyNameFontSize: z.coerce.number().int().min(42).max(108),
  companyDescriptionFontSize: z.coerce.number().int().min(16).max(40),
  companyNameFontWeight: z.enum(["300", "400", "500", "600", "700", "800"]),
  companyDescriptionFontWeight: z.enum(["300", "400", "500", "600", "700", "800"]),
  companyNameColorMode: z.enum(["auto", "manual"]),
  companyNameTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  companyDescriptionColorMode: z.enum(["auto", "manual"]),
  companyDescriptionTextColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  companyPageType: z.enum(["company", "agency", "personal-brand"]),
  primaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  secondaryBrandColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  phoneNumber: z.string().trim().min(6).max(40),
  phoneIconOffsetX: z.coerce.number().int().min(-400).max(400),
  phoneIconOffsetY: z.coerce.number().int().min(-200).max(200),
  layoutPrimaryLogoDeltaX: layoutDeltaField,
  layoutPrimaryLogoDeltaY: layoutDeltaField,
  layoutSecondaryLogoDeltaX: layoutDeltaField,
  layoutSecondaryLogoDeltaY: layoutDeltaField,
  layoutTextBlockDeltaX: layoutDeltaField,
  layoutTextBlockDeltaY: layoutDeltaField,
  layoutPhoneGroupDeltaX: layoutDeltaField,
  layoutPhoneGroupDeltaY: layoutDeltaField,
  imageModel: z.enum(["gpt-image-1", "gpt-image-1-mini"]),
  stylePreset: z.enum([
    "corporate",
    "modern",
    "minimal",
    "bold",
    "premium",
    "elegant",
    "vibrant",
    "dark-tech",
    "clean-light",
    "gradient-wave"
  ])
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

const unionLayoutRects = (rects: LayoutElementRect[], padding: number): LayoutElementRect => {
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
  const width = Math.min(BANNER_WIDTH - left, maxR - minL + padding * 2);
  const height = Math.min(BANNER_HEIGHT - top, maxB - minT + padding * 2);
  return { left, top, width: Math.max(1, width), height: Math.max(1, height) };
};

/** Resize/crop AI output to banner size and remove transparency. */
export const normalizeBackgroundBuffer = async (buffer: Buffer, flattenColor: string): Promise<Buffer> => {
  return sharp(buffer)
    .resize(BANNER_WIDTH, BANNER_HEIGHT, {
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
  return sharp(buffer).resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: true }).png().toBuffer();
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
  sampleArea: { left: number; top: number; width: number; height: number }
): Promise<string> => {
  const sampleWidth = Math.max(64, Math.min(sampleArea.width, BANNER_WIDTH - sampleArea.left));
  const sampleHeight = Math.max(48, Math.min(sampleArea.height, BANNER_HEIGHT - sampleArea.top));

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
  const maxLogoWidth = Math.round(LAYOUT_PRIMARY_LOGO_BOX * patchLogoScale);
  const maxLogoHeight = Math.round(LAYOUT_PRIMARY_LOGO_BOX * patchLogoScale);
  const margin = LAYOUT_MARGIN;
  const logoTopLeft = LAYOUT_LOGO_TOP;
  const contentStartX = LAYOUT_CONTENT_START_X + values.layoutTextBlockDeltaX;
  const titleY = LAYOUT_TITLE_Y + values.layoutTextBlockDeltaY;

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
    secondaryBuffer = await resizeLogoBuffer(Buffer.from(await secondaryLogo.arrayBuffer()), LAYOUT_SECONDARY_LOGO_BOX, LAYOUT_SECONDARY_LOGO_BOX);
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
  const descriptionLines = wrapTextLines(values.companyDescription, 62, 2);
  const phoneRaw = values.phoneNumber.trim();
  const companyNameFontSize = values.companyNameFontSize;
  const companyDescriptionFontSize = values.companyDescriptionFontSize;
  const companyNameFontWeight = values.companyNameFontWeight;
  const companyDescriptionFontWeight = values.companyDescriptionFontWeight;
  const descriptionLineGap = Math.round(companyDescriptionFontSize * 1.25);
  const descriptionStartY = titleY + Math.round(companyNameFontSize * 0.54);
  const currentLeft = contentStartX;

  const autoNameColorSampleArea = {
    left: currentLeft,
    top: Math.max(0, titleY - 56),
    width: Math.max(220, BANNER_WIDTH - currentLeft - 160),
    height: 112
  };
  const autoDescriptionColorSampleArea = {
    left: currentLeft,
    top: Math.max(0, descriptionStartY - companyDescriptionFontSize),
    width: Math.max(220, BANNER_WIDTH - currentLeft - 180),
    height: 80
  };
  const autoPhoneColorSampleArea = {
    left: Math.max(0, BANNER_WIDTH - 280),
    top: Math.max(0, BANNER_HEIGHT - 80),
    width: 260,
    height: 64
  };
  const companyNameTextColor =
    values.companyNameColorMode === "manual"
      ? values.companyNameTextColor
      : await resolveAutoContrastColor(bannerBuffer, autoNameColorSampleArea);
  const descriptionTextColor =
    values.companyDescriptionColorMode === "manual"
      ? values.companyDescriptionTextColor
      : await resolveAutoContrastColor(bannerBuffer, autoDescriptionColorSampleArea);
  const phoneTextColor = await resolveAutoContrastColor(bannerBuffer, autoPhoneColorSampleArea);

  const textMaxWidth = Math.max(180, BANNER_WIDTH - currentLeft - 140);

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

  const textBlockRect =
    textRectsForUnion.length > 0
      ? unionLayoutRects(textRectsForUnion, 6)
      : ({
          left: currentLeft,
          top: Math.max(0, Math.round(titleY - companyNameFontSize * 0.72)),
          width: Math.min(textMaxWidth, 400),
          height: Math.round(companyNameFontSize + companyDescriptionFontSize * 2.8)
        } satisfies LayoutElementRect);

  const phoneFontSize = 22;
  const iconSize = 30;
  const iconGap = 8;
  const phoneRightX = BANNER_WIDTH - 18 + values.layoutPhoneGroupDeltaX;
  const phoneRowCenterY = BANNER_HEIGHT - 22 + values.layoutPhoneGroupDeltaY;

  let phoneGroupRect: LayoutElementRect | null = null;

  if (phoneRaw) {
    const phoneRaster = await renderTextRaster({
      text: phoneRaw,
      fontStyle: values.companyNameFontStyle,
      fontWeight: "500",
      fontSizePx: phoneFontSize,
      colorHex: phoneTextColor,
      maxWidth: 480,
      align: "right"
    });

    let phoneLeft = 0;
    let phoneTop = 0;
    let phoneW = 0;
    let phoneH = 0;

    if (phoneRaster) {
      phoneW = phoneRaster.width;
      phoneH = phoneRaster.height;
      phoneLeft = Math.max(0, phoneRightX - phoneW);
      phoneTop = Math.max(0, Math.round(phoneRowCenterY - phoneH / 2));
    }

    let iconX =
      (phoneRaster ? phoneLeft : phoneRightX) - iconGap - iconSize + values.phoneIconOffsetX;
    let iconY = Math.round(phoneRowCenterY - iconSize / 2) + values.phoneIconOffsetY;

    if (!phoneRaster) {
      iconX = phoneRightX - iconSize + values.phoneIconOffsetX;
    }

    iconX = Math.min(BANNER_WIDTH - iconSize - 2, Math.max(2, iconX));
    iconY = Math.min(BANNER_HEIGHT - iconSize - 2, Math.max(2, iconY));

    const phoneIconSvg = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.25 4.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .72.53l.6 2.1a.75.75 0 0 1-.23.77l-1.05.87a11.04 11.04 0 0 0 5.28 5.28l.87-1.05a.75.75 0 0 1 .77-.23l2.1.6a.75.75 0 0 1 .53.72V15a.75.75 0 0 1-.75.75H12A9.75 9.75 0 0 1 2.25 6V4.5z" fill="${phoneTextColor}"/>
    </svg>
  `;
    overlays.push({ input: Buffer.from(phoneIconSvg), left: iconX, top: iconY });

    if (phoneRaster) {
      overlays.push({ input: phoneRaster.buffer, left: phoneLeft, top: phoneTop });
    }

    const iconRect: LayoutElementRect = { left: iconX, top: iconY, width: iconSize, height: iconSize };
    if (phoneRaster) {
      const textRect: LayoutElementRect = { left: phoneLeft, top: phoneTop, width: phoneW, height: phoneH };
      phoneGroupRect = unionLayoutRects([iconRect, textRect], 4);
    } else {
      phoneGroupRect = unionLayoutRects([iconRect], 4);
    }
  }

  const secondaryLogoLeft = BANNER_WIDTH - secondaryWidth - LAYOUT_SECONDARY_LOGO_RIGHT_PAD + values.layoutSecondaryLogoDeltaX;
  const secondaryLogoTop = LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY;

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

/** GPT image only; saved as PNG under public/generated. Does not composite logos/text. */
export const runBackgroundOnlyGeneration = async (
  values: BannerGenerationInput,
  primaryLogo?: File | null,
  secondaryLogo?: File | null
): Promise<GeneratedBannerResult> => {
  const patch = getRevisionPatch(values.revisionAction);
  // Background stage intentionally excludes direct brand text/logo cues.
  void primaryLogo;
  void secondaryLogo;

  const prompt = buildStructuredPrompt({
    values,
    promptDelta: patch.promptDelta,
    reduceClutter: patch.reduceClutter
  });

  const baseImageBuffer = await generateCreativeBaseImage(prompt, values.regenerateNonce, values.imageModel);
  const basePngBuffer = await normalizeBackgroundBuffer(baseImageBuffer, values.secondaryBrandColor);
  const stored = await saveOutputPng(basePngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl
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
  const patch = getRevisionPatch(undefined);
  const { buffer: pngBuffer, layoutOverlay } = await overlayBrandElements(buffer, values, patch.logoScale, primaryLogo, secondaryLogo);
  const stored = await saveOutputPng(pngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl,
    layoutOverlay
  };
};

export const parseBannerInput = (formData: FormData): {
  values: BannerGenerationInput;
  primaryLogo: File | null;
  secondaryLogo: File | null;
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
    phoneIconOffsetX: parseFormValue(formData.get("phoneIconOffsetX")),
    phoneIconOffsetY: parseFormValue(formData.get("phoneIconOffsetY")),
    layoutPrimaryLogoDeltaX: parseFormValue(formData.get("layoutPrimaryLogoDeltaX")),
    layoutPrimaryLogoDeltaY: parseFormValue(formData.get("layoutPrimaryLogoDeltaY")),
    layoutSecondaryLogoDeltaX: parseFormValue(formData.get("layoutSecondaryLogoDeltaX")),
    layoutSecondaryLogoDeltaY: parseFormValue(formData.get("layoutSecondaryLogoDeltaY")),
    layoutTextBlockDeltaX: parseFormValue(formData.get("layoutTextBlockDeltaX")),
    layoutTextBlockDeltaY: parseFormValue(formData.get("layoutTextBlockDeltaY")),
    layoutPhoneGroupDeltaX: parseFormValue(formData.get("layoutPhoneGroupDeltaX")),
    layoutPhoneGroupDeltaY: parseFormValue(formData.get("layoutPhoneGroupDeltaY")),
    imageModel: parseFormValue(formData.get("imageModel")) as BannerGenerationInput["imageModel"],
    stylePreset: parseFormValue(formData.get("stylePreset")) as StylePresetId
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
    secondaryLogo: parseOptionalFile(formData.get("secondaryLogo"))
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

  const baseImageBuffer = await generateCreativeBaseImage(prompt, values.regenerateNonce, values.imageModel);
  const basePngBuffer = await normalizeBackgroundBuffer(baseImageBuffer, values.secondaryBrandColor);
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
