import { readFile } from "fs/promises";
import path from "path";

// Vercel Blob public URLs always use this host suffix — used for allowlisting only.
const VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** SSRF-safe: only Vercel Blob public hostnames are allowed for server-side fetch. */
export const isTrustedBackgroundHttpsUrl = (href: string): boolean => {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return host.endsWith(VERCEL_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
};

/**
 * Load background PNG bytes from a local `/generated/...` path (dev) or a trusted HTTPS blob URL (production).
 */
export const resolveBackgroundImageBuffer = async (source: string): Promise<Buffer> => {
  const trimmed = source.split("?")[0] ?? source;

  // Local Next dev: backgrounds still live on disk under public/generated.
  if (trimmed.startsWith("/generated/")) {
    const basename = path.basename(trimmed);
    if (!/^[a-zA-Z0-9-]+\.png$/i.test(basename)) {
      throw new Error("Invalid background filename.");
    }
    const fullPath = path.join(process.cwd(), "public", "generated", basename);
    return readFile(fullPath);
  }

  if (!isTrustedBackgroundHttpsUrl(trimmed)) {
    throw new Error("Invalid background URL.");
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error("Failed to load background image.");
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
