import { StylePresetId } from "@/types/banner";

export interface StylePreset {
  id: StylePresetId;
  label: string;
  promptTone: string;
  gradientOpacity: number;
  textColor: string;
  accentColor: string;
}

export const STYLE_PRESETS: Record<StylePresetId, StylePreset> = {
  corporate: {
    id: "corporate",
    label: "Corporate",
    promptTone: "clean corporate, balanced whitespace, professional and trustworthy",
    gradientOpacity: 0.42,
    textColor: "#FFFFFF",
    accentColor: "#E2E8F0"
  },
  "corporate-2": {
    id: "corporate-2",
    label: "Corporate 2",
    promptTone:
      "modern B2B marketing banner, blue-first palette, structured geometry, optional gold accent, agency-ready layouts",
    gradientOpacity: 0.38,
    textColor: "#FFFFFF",
    accentColor: "#E2E8F0"
  },
  modern: {
    id: "modern",
    label: "Modern",
    promptTone: "modern geometric abstraction, crisp contrast, dynamic but minimal clutter",
    gradientOpacity: 0.34,
    textColor: "#FFFFFF",
    accentColor: "#BFDBFE"
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    promptTone: "minimal soft gradients, subtle texture, calm and premium simplicity",
    gradientOpacity: 0.5,
    textColor: "#FFFFFF",
    accentColor: "#DBEAFE"
  },
  bold: {
    id: "bold",
    label: "Bold",
    promptTone: "bold high-contrast geometric layers with energetic movement",
    gradientOpacity: 0.36,
    textColor: "#FFFFFF",
    accentColor: "#93C5FD"
  },
  premium: {
    id: "premium",
    label: "Premium",
    promptTone: "premium polished gradients, elegant depth, luxury but clean B2B style",
    gradientOpacity: 0.46,
    textColor: "#F8FAFC",
    accentColor: "#E2E8F0"
  },
  elegant: {
    id: "elegant",
    label: "Elegant",
    promptTone: "elegant smooth curves, restrained palette, refined composition",
    gradientOpacity: 0.4,
    textColor: "#F8FAFC",
    accentColor: "#CBD5E1"
  },
  vibrant: {
    id: "vibrant",
    label: "Vibrant",
    promptTone: "vibrant modern color energy with clean readability zones",
    gradientOpacity: 0.32,
    textColor: "#FFFFFF",
    accentColor: "#BFDBFE"
  },
  "dark-tech": {
    id: "dark-tech",
    label: "Dark Tech",
    promptTone: "dark tech-inspired gradients with subtle futuristic highlights",
    gradientOpacity: 0.52,
    textColor: "#F8FAFC",
    accentColor: "#94A3B8"
  },
  "clean-light": {
    id: "clean-light",
    label: "Clean Light",
    promptTone: "clean light background with soft professional abstract forms",
    gradientOpacity: 0.24,
    textColor: "#0F172A",
    accentColor: "#334155"
  },
  "gradient-wave": {
    id: "gradient-wave",
    label: "Gradient Wave",
    promptTone: "flowing gradient wave layers with depth and calm movement",
    gradientOpacity: 0.38,
    textColor: "#FFFFFF",
    accentColor: "#DBEAFE"
  }
};
