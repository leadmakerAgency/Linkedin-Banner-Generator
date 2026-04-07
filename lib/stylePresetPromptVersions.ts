import type { StylePresetId } from "@/types/banner";

/** Five descriptive sentences per style (canonical copy from Style Preset Versions CSV). */
export const STYLE_PRESET_PROMPT_VERSIONS: Record<
  StylePresetId,
  readonly [string, string, string, string, string]
> = {
  corporate: [
    "Modern sans-serif typography that feels polished, readable, and executive-friendly.",
    "Structured composition with balanced spacing and clear visual hierarchy.",
    "Conservative business color palette with navy, gray, white, and subtle accent tones.",
    "Clean geometric elements that reinforce trust, stability, and professionalism.",
    "Refined branding atmosphere suited for consultants, agencies, executives, and B2B profiles."
  ],
  modern: [
    "Sleek contemporary typography with clean edges and confident visual presence.",
    "Fresh layout with dynamic balance and intentional asymmetry.",
    "Smooth gradients, subtle abstract shapes, and crisp modern detailing.",
    "Sharp contrast and minimal clutter for a current digital-first aesthetic.",
    "Forward-thinking brand energy suited for personal brands, startups, and creators."
  ],
  minimal: [
    "Thin lines, simple shapes, and clean typography that create a calm professional feel.",
    "Generous negative space that gives the design clarity and breathing room.",
    "Restrained color palette with soft neutrals and low visual noise.",
    "Essential elements only, with no unnecessary decoration or heavy effects.",
    "Quiet premium atmosphere built through simplicity, precision, and restraint."
  ],
  bold: [
    "Large high-impact typography with strong weight and confident presence.",
    "Powerful contrast between background, text, and graphic elements.",
    "Assertive layout with dominant focal points and clear directional flow.",
    "Solid shapes, graphic blocks, and visual anchors that feel strong and deliberate.",
    "Energetic branding tone that feels fearless, memorable, and attention-grabbing."
  ],
  premium: [
    "Sophisticated typography with elegant spacing and a luxury editorial feel.",
    "High-end color palette with black, ivory, charcoal, beige, or muted metallic accents.",
    "Subtle textures and refined visual depth that suggest exclusivity.",
    "Clean composition with polished alignment and understated detail.",
    "Elevated brand mood suited for founders, luxury consultants, and premium service positioning."
  ],
  elegant: [
    "Graceful typography with refined proportions and soft visual rhythm.",
    "Smooth layout flow with balanced spacing and understated harmony.",
    "Tasteful neutral or muted rich tones that feel timeless and composed.",
    "Delicate accents, soft curves, and minimal decorative sophistication.",
    "Classy personal branding atmosphere with a polished and timeless finish."
  ],
  vibrant: [
    "Bright accent colors used with control to keep the design energetic but professional.",
    "Lively composition with dynamic shapes and expressive visual movement.",
    "Bold readable typography that holds attention against colorful elements.",
    "Layered gradients and modern abstract forms that add freshness and momentum.",
    "Creative high-energy brand identity suited for expressive professionals and digital creators."
  ],
  "dark-tech": [
    "Sharp futuristic typography with a sleek and intelligent digital feel.",
    "Deep backgrounds such as black, graphite, or dark navy with glowing accent colors.",
    "Tech-inspired elements like grids, data lines, interface patterns, and light streaks.",
    "High contrast and subtle neon highlights that create a cutting-edge atmosphere.",
    "Advanced innovation-focused branding suited for AI, SaaS, development, and cybersecurity profiles."
  ],
  "clean-light": [
    "Crisp typography with light visual weight and excellent readability.",
    "Bright open layout with airy spacing and soft visual balance.",
    "White or pale backgrounds supported by light grays and one restrained accent color.",
    "Minimal shapes and subtle depth for a fresh polished appearance.",
    "Friendly professional tone that feels modern, smart, and approachable."
  ],
  "gradient-wave": [
    "Flowing gradient waves that create smooth movement and modern depth.",
    "Soft color transitions that feel polished, balanced, and digitally refined.",
    "Clean typography that stays readable against fluid abstract backgrounds.",
    "Curved layered forms that guide the eye without overwhelming the content.",
    "Contemporary visual identity suited for tech professionals, creatives, and personal brands."
  ]
};

export const getStylePromptSentence = (preset: StylePresetId, variantIndex: number): string => {
  const versions = STYLE_PRESET_PROMPT_VERSIONS[preset];
  const clamped = Math.max(0, Math.min(4, Math.floor(Number.isFinite(variantIndex) ? variantIndex : 0)));
  return versions[clamped];
};
