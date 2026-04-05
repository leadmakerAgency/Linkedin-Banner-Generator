import path from "path";
import type { FontStyleId, FontWeightId } from "@/types/banner";

const SERIF_STYLES = new Set<FontStyleId>(["playfairDisplay", "merriweather", "libreBaskerville"]);

export const isSerifFontStyle = (style: FontStyleId): boolean => SERIF_STYLES.has(style);

/** Bundled OFL variable fonts (google/fonts). Sans for UI presets; serif for display-style presets. */
export const getBundledFont = (
  style: FontStyleId
): {
  fontfile: string;
  fontFamily: string;
} => {
  const root = process.cwd();
  if (isSerifFontStyle(style)) {
    return {
      fontfile: path.join(root, "assets", "fonts", "NotoSerif-Variable.ttf"),
      fontFamily: "Noto Serif"
    };
  }
  return {
    fontfile: path.join(root, "assets", "fonts", "NotoSans-Variable.ttf"),
    fontFamily: "Noto Sans"
  };
};

/** Pango numeric weight for variable Noto files. */
export const pangoWeight = (weight: FontWeightId): number => Number(weight);
