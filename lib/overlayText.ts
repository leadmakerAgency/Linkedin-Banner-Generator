import sharp from "sharp";
import type { FontStyleId, FontWeightId } from "@/types/banner";
import { getBundledFont, pangoWeight } from "@/lib/overlayFonts";

const escapePangoMarkup = (value: string): string => {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
};

export interface TextRasterResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Rasterize a single line or wrapped block using Sharp/Pango with a bundled TTF (required on serverless Linux).
 */
export const renderTextRaster = async (options: {
  text: string;
  fontStyle: FontStyleId;
  fontWeight: FontWeightId;
  fontSizePx: number;
  colorHex: string;
  maxWidth: number;
  align: "left" | "right" | "centre";
  /** Defaults to word wrap. Use "none" for single-line labels (e.g. phone) where spaces must not break lines. */
  textWrap?: "word" | "none";
}): Promise<TextRasterResult | null> => {
  const trimmed = options.text.trim();
  if (!trimmed) {
    return null;
  }

  const { fontfile, fontFamily } = getBundledFont(options.fontStyle);
  const weight = pangoWeight(options.fontWeight);
  const markup = `<span foreground="${options.colorHex}" font_weight="${weight}">${escapePangoMarkup(trimmed)}</span>`;

  const align = options.align === "centre" ? "center" : options.align;
  const dpi = Math.round(Math.min(600, Math.max(96, options.fontSizePx * 5.5)));

  const textWrap = options.textWrap ?? "word";

  const raw = await sharp({
    text: {
      text: markup,
      font: fontFamily,
      fontfile,
      width: options.maxWidth,
      dpi,
      rgba: true,
      align,
      ...(textWrap === "word" ? { wrap: "word" as const } : { wrap: "none" as const })
    }
  })
    .png()
    .toBuffer();

  const trimmedImage = await sharp(raw).trim().png().toBuffer({ resolveWithObject: true });

  return {
    buffer: trimmedImage.data,
    width: trimmedImage.info.width ?? 0,
    height: trimmedImage.info.height ?? 0
  };
};
