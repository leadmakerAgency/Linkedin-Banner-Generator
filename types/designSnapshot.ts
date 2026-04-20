import type { BannerFormValues, LayoutOverlayPayload } from "@/types/banner";

/** Persisted JSON for `banner_design_versions.snapshot`. */
export type DesignSnapshotJson = {
  form: BannerFormValues;
  promptSnapshot: string;
  layoutOverlay: LayoutOverlayPayload | null;
};
