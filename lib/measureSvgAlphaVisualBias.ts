import sharp from "sharp";

/**
 * Measures how far the trimmed non-transparent pixels are from the canvas center,
 * for a square SVG rendered at `squareSizePx`.
 *
 * Sharp exposes `trimOffsetTop/Left` on the output image metadata after `trim()`.
 * Returned value is the **delta to add to `iconY`** so the handset ink centers on the square's geometric center.
 */
export const measureSquareSvgVerticalVisualBiasPx = async (svgMarkup: string, squareSizePx: number): Promise<number> => {
  if (!Number.isFinite(squareSizePx) || squareSizePx <= 0) {
    return 0;
  }

  try {
    const raster = await sharp(Buffer.from(svgMarkup)).png().toBuffer();
    const meta = await sharp(raster).metadata();
    const canvasH = meta.height ?? squareSizePx;

    const trimmed = await sharp(raster).trim().toBuffer({ resolveWithObject: true });
    const info = trimmed.info;

    const w = typeof info.width === "number" ? info.width : 0;
    const h = typeof info.height === "number" ? info.height : 0;
    if (w <= 0 || h <= 0) {
      return 0;
    }

    const trimOffsetTop = typeof info.trimOffsetTop === "number" ? info.trimOffsetTop : 0;

    // Sharp exposes trim offsets with a sign; for bbox reconstruction use absolute offsets
    // (see Sharp maintainer guidance in https://github.com/lovell/sharp/issues/4086).
    const top = Math.abs(trimOffsetTop);

    // Ink bbox center in original canvas coordinates.
    const inkCenterY = top + h / 2;
    const canvasCenterY = canvasH / 2;
    const nudgeY = canvasCenterY - inkCenterY;

    const maxBias = canvasH * 0.35;
    return Math.max(-maxBias, Math.min(maxBias, nudgeY));
  } catch {
    return 0;
  }
};
