import path from "path";
import type { FontStyleId, FontWeightId } from "@/types/banner";

const FONT_FILES: Record<
  FontStyleId,
  {
    fontfile: string;
    fontFamily: string;
  }
> = {
  inter: { fontfile: "Inter.ttf", fontFamily: "Inter" },
  poppins: { fontfile: "Poppins.ttf", fontFamily: "Poppins" },
  montserrat: { fontfile: "Montserrat.ttf", fontFamily: "Montserrat" },
  lato: { fontfile: "Lato.ttf", fontFamily: "Lato" },
  roboto: { fontfile: "Roboto.ttf", fontFamily: "Roboto" },
  openSans: { fontfile: "OpenSans.ttf", fontFamily: "Open Sans" },
  nunito: { fontfile: "Nunito.ttf", fontFamily: "Nunito" },
  raleway: { fontfile: "Raleway.ttf", fontFamily: "Raleway" },
  oswald: { fontfile: "Oswald.ttf", fontFamily: "Oswald" },
  playfairDisplay: { fontfile: "PlayfairDisplay.ttf", fontFamily: "Playfair Display" },
  merriweather: { fontfile: "Merriweather.ttf", fontFamily: "Merriweather" },
  ubuntu: { fontfile: "Ubuntu.ttf", fontFamily: "Ubuntu" },
  workSans: { fontfile: "WorkSans.ttf", fontFamily: "Work Sans" },
  sourceSansPro: { fontfile: "SourceSansPro.ttf", fontFamily: "Source Sans Pro" },
  manrope: { fontfile: "Manrope.ttf", fontFamily: "Manrope" },
  mulish: { fontfile: "Mulish.ttf", fontFamily: "Mulish" },
  quicksand: { fontfile: "Quicksand.ttf", fontFamily: "Quicksand" },
  ptSans: { fontfile: "PTSans.ttf", fontFamily: "PT Sans" },
  dmSans: { fontfile: "DMSans.ttf", fontFamily: "DM Sans" },
  libreBaskerville: { fontfile: "LibreBaskerville.ttf", fontFamily: "Libre Baskerville" }
};

const SERIF_STYLES = new Set<FontStyleId>(["playfairDisplay", "merriweather", "libreBaskerville"]);

export const isSerifFontStyle = (style: FontStyleId): boolean => SERIF_STYLES.has(style);

/** Bundled local fonts for deterministic server-side text rasterization. */
export const getBundledFont = (
  style: FontStyleId
): {
  fontfile: string;
  fontFamily: string;
} => {
  const root = process.cwd();
  const selected = FONT_FILES[style];
  return {
    fontfile: path.join(root, "assets", "fonts", selected.fontfile),
    fontFamily: selected.fontFamily
  };
};

/** Pango numeric weight value (100-900). */
export const pangoWeight = (weight: FontWeightId): number => Number(weight);
