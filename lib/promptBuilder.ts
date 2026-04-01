import { STYLE_PRESETS } from "@/lib/stylePresets";
import { BannerGenerationInput } from "@/types/banner";

interface PromptBuilderInput {
  values: BannerGenerationInput;
  promptDelta?: string;
  reduceClutter?: boolean;
}

const DESIGN_CONCEPTS = [
  "layered glassmorphism waves with subtle depth",
  "diagonal abstract ribbons with directional light",
  "soft gradient mesh with minimal geometric accents",
  "premium dark-to-light gradient with luminous arcs",
  "clean geometric panels with modern B2B motion feel",
  "aurora-inspired smooth flow shapes with high contrast focal area"
];

const hashFromNonce = (nonce?: string): number => {
  if (!nonce) {
    return Date.now();
  }

  let hash = 0;
  for (let index = 0; index < nonce.length; index += 1) {
    hash = (hash << 5) - hash + nonce.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
};

export const buildStructuredPrompt = ({ values, promptDelta, reduceClutter }: PromptBuilderInput): string => {
  const style = STYLE_PRESETS[values.stylePreset];
  const clutterGuidance = reduceClutter
    ? "very sparse details, high whitespace, no busy textures"
    : "balanced decorative abstract details";
  const conceptIndex = hashFromNonce(values.regenerateNonce) % DESIGN_CONCEPTS.length;
  const selectedConcept = DESIGN_CONCEPTS[conceptIndex];
  const regenerationInstruction = values.regenerateNonce
    ? `Regeneration request ${values.regenerateNonce}: produce a clearly different composition, lighting direction, and abstract structure from previous generations while preserving brand tone.`
    : "";

  return [
    "Create a high-quality LinkedIn banner background only.",
    `Audience context: ${values.companyPageType.replace("-", " ")}.`,
    `Banner type: ${values.bannerType}.`,
    "This is stage 1 only: generate abstract background art with empty composition zones for overlays.",
    `Company name text color mode: ${values.companyNameColorMode}.`,
    `Company description text color mode: ${values.companyDescriptionColorMode}.`,
    `Image generation model: ${values.imageModel}.`,
    `Brand direction: primary color ${values.primaryBrandColor}, secondary color ${values.secondaryBrandColor}.`,
    `Style preset: ${style.promptTone}.`,
    `Creative concept: ${selectedConcept}.`,
    `Clutter level: ${clutterGuidance}.`,
    "Do not render any text, letters, words, numbers, buttons, logos, icons, monograms, badges, or symbols.",
    "The app overlays company name, description, phone, and uploaded logo after generation.",
    "Layout rules: keep the left 30 percent of the banner visually clean for LinkedIn profile-picture overlap.",
    "Composition: horizontal, premium B2B SaaS feeling with clean negative space for overlays.",
    "Final aspect ratio must be exactly 4:1 and suitable for 1584x396 export.",
    regenerationInstruction,
    promptDelta ?? ""
  ]
    .filter(Boolean)
    .join(" ");
};
