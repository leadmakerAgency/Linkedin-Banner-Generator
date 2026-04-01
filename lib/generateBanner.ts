import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
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
  RevisionAction,
  StylePresetId
} from "@/types/banner";
import sharp from "sharp";

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
}

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

/** Load a previously saved background from `public/generated/...`. */
export const readBackgroundBufferFromPublicUrl = async (publicUrl: string): Promise<Buffer> => {
  if (!publicUrl.startsWith("/generated/")) {
    throw new Error("Invalid background URL.");
  }
  const basename = path.basename(publicUrl);
  if (!/^[a-zA-Z0-9-]+\.png$/i.test(basename)) {
    throw new Error("Invalid background filename.");
  }
  const fullPath = path.join(process.cwd(), "public", "generated", basename);
  return readFile(fullPath);
};

const resizeLogoBuffer = async (buffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> => {
  return sharp(buffer).resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: true }).png().toBuffer();
};

const escapeXml = (text: string): string => {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
): Promise<Buffer> => {
  const fontFamilyMap: Record<BannerGenerationInput["companyNameFontStyle"], string> = {
    inter: "Inter, Arial, sans-serif",
    poppins: "Poppins, Arial, sans-serif",
    montserrat: "Montserrat, Arial, sans-serif",
    lato: "Lato, Arial, sans-serif",
    roboto: "Roboto, Arial, sans-serif",
    openSans: "Open Sans, Arial, sans-serif",
    nunito: "Nunito, Arial, sans-serif",
    raleway: "Raleway, Arial, sans-serif",
    oswald: "Oswald, Arial, sans-serif",
    playfairDisplay: "Playfair Display, Georgia, serif",
    merriweather: "Merriweather, Georgia, serif",
    ubuntu: "Ubuntu, Arial, sans-serif",
    workSans: "Work Sans, Arial, sans-serif",
    sourceSansPro: "Source Sans Pro, Arial, sans-serif",
    manrope: "Manrope, Arial, sans-serif",
    mulish: "Mulish, Arial, sans-serif",
    quicksand: "Quicksand, Arial, sans-serif",
    ptSans: "PT Sans, Arial, sans-serif",
    dmSans: "DM Sans, Arial, sans-serif",
    libreBaskerville: "Libre Baskerville, Georgia, serif"
  };
  const maxLogoWidth = Math.round(88 * patchLogoScale);
  const maxLogoHeight = Math.round(88 * patchLogoScale);
  const margin = 20;
  const contentStartX = Math.round(BANNER_WIDTH * 0.3) + 24;
  const titleY = Math.round(BANNER_HEIGHT * 0.46);

  const overlays: sharp.OverlayOptions[] = [];
  let primaryBuffer: Buffer | undefined;
  let primaryWidth = 0;
  let secondaryBuffer: Buffer | undefined;
  let secondaryWidth = 0;

  if (primaryLogo) {
    primaryBuffer = await resizeLogoBuffer(Buffer.from(await primaryLogo.arrayBuffer()), maxLogoWidth, maxLogoHeight);
    const meta = await sharp(primaryBuffer).metadata();
    primaryWidth = meta.width ?? 0;
  }

  if (secondaryLogo) {
    secondaryBuffer = await resizeLogoBuffer(Buffer.from(await secondaryLogo.arrayBuffer()), 72, 72);
    const meta = await sharp(secondaryBuffer).metadata();
    secondaryWidth = meta.width ?? 0;
  }

  const currentLeft = contentStartX;
  const logoTopLeft = margin;

  if (primaryBuffer && primaryWidth > 0) {
    overlays.push({
      input: primaryBuffer,
      left: margin,
      top: logoTopLeft
    });
  }

  const companyName = escapeXml(values.companyName);
  const descriptionLines = wrapTextLines(values.companyDescription, 62, 2).map((line) => escapeXml(line));
  const phone = escapeXml(values.phoneNumber);
  const companyNameFontSize = values.companyNameFontSize;
  const companyDescriptionFontSize = values.companyDescriptionFontSize;
  const companyNameFontWeight = values.companyNameFontWeight;
  const companyDescriptionFontWeight = values.companyDescriptionFontWeight;
  const descriptionLineGap = Math.round(companyDescriptionFontSize * 1.25);
  const descriptionStartY = titleY + Math.round(companyNameFontSize * 0.54);
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
  const companyNameFontFamily = fontFamilyMap[values.companyNameFontStyle];
  const descriptionFontFamily = fontFamilyMap[values.companyDescriptionFontStyle];
  const secondaryLogoLeft = BANNER_WIDTH - secondaryWidth - 26;
  const secondaryLogoTop = 24;
  const phoneFontSize = 22;
  const iconSize = 30;
  const phoneAnchorX = BANNER_WIDTH - 18;
  const phoneBaselineY = BANNER_HEIGHT - 8;
  const approxPhoneWidth = Math.max(90, Math.round(phone.length * phoneFontSize * 0.55));
  const iconGap = 4;
  const baseIconX = phoneAnchorX - approxPhoneWidth - iconSize - iconGap;
  const baseIconY = phoneBaselineY - iconSize + 11;
  const iconX = Math.min(BANNER_WIDTH - iconSize - 2, Math.max(2, baseIconX + values.phoneIconOffsetX));
  const iconY = Math.min(BANNER_HEIGHT - iconSize - 2, Math.max(2, baseIconY + values.phoneIconOffsetY));
  const phoneTextY = iconY + iconSize / 2;

  const textOverlaySvg = `
    <svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" viewBox="0 0 ${BANNER_WIDTH} ${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <text x="${currentLeft}" y="${titleY}" fill="${companyNameTextColor}" font-size="${companyNameFontSize}" font-weight="${companyNameFontWeight}" font-family="${companyNameFontFamily}">
        ${companyName}
      </text>
      <text x="${currentLeft}" y="${descriptionStartY}" fill="${descriptionTextColor}" font-size="${companyDescriptionFontSize}" font-weight="${companyDescriptionFontWeight}" font-family="${descriptionFontFamily}">
        ${(descriptionLines[0] ?? "")}
      </text>
      <text x="${currentLeft}" y="${descriptionStartY + descriptionLineGap}" fill="${descriptionTextColor}" font-size="${companyDescriptionFontSize}" font-weight="${companyDescriptionFontWeight}" font-family="${descriptionFontFamily}">
        ${(descriptionLines[1] ?? "")}
      </text>
      <g transform="translate(${iconX} ${iconY}) scale(${iconSize / 24})">
        <path d="M2.25 4.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .72.53l.6 2.1a.75.75 0 0 1-.23.77l-1.05.87a11.04 11.04 0 0 0 5.28 5.28l.87-1.05a.75.75 0 0 1 .77-.23l2.1.6a.75.75 0 0 1 .53.72V15a.75.75 0 0 1-.75.75H12A9.75 9.75 0 0 1 2.25 6V4.5z" fill="${phoneTextColor}"/>
      </g>
      <text x="${phoneAnchorX}" y="${phoneTextY}" fill="${phoneTextColor}" font-size="${phoneFontSize}" font-weight="500" text-anchor="end" dominant-baseline="middle" font-family="Inter, Arial, sans-serif">
        ${phone}
      </text>
    </svg>
  `;
  overlays.push({ input: Buffer.from(textOverlaySvg), top: 0, left: 0 });

  if (secondaryBuffer && secondaryWidth > 0) {
    overlays.push({ input: secondaryBuffer, left: secondaryLogoLeft, top: secondaryLogoTop });
  }

  return sharp(bannerBuffer).composite(overlays).flatten({ background: values.secondaryBrandColor }).png().toBuffer();
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
  const pngBuffer = await overlayBrandElements(buffer, values, patch.logoScale, primaryLogo, secondaryLogo);
  const stored = await saveOutputPng(pngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl
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
  const pngBuffer = await overlayBrandElements(basePngBuffer, values, patch.logoScale, primaryLogo, secondaryLogo);

  const stored = await saveOutputPng(pngBuffer);
  return {
    filename: stored.filename,
    imageUrl: stored.publicUrl
  };
};
