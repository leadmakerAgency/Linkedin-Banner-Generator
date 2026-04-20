import { resolveBackgroundImageBuffer } from "@/lib/backgroundSource";
import { downloadBannerPng } from "@/lib/bannerDesigns";

/**
 * Loads background bytes for overlay: Supabase storage path (preferred) or legacy URL (/generated, Blob).
 */
export const resolveBackgroundBufferForOverlay = async (input: {
  backgroundStoragePath?: string | null;
  backgroundUrl?: string | null;
}): Promise<Buffer> => {
  const path = input.backgroundStoragePath?.trim();
  if (path) {
    return downloadBannerPng(path);
  }
  const url = input.backgroundUrl?.trim();
  if (!url) {
    throw new Error("Background reference is required.");
  }
  return resolveBackgroundImageBuffer(url);
};
