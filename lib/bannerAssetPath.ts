import { randomUUID } from "crypto";

const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(
  `^(backgrounds|previews|logos)/(${UUID_SEGMENT})/[a-zA-Z0-9._-]+\\.png$`,
  "i"
);
const BACKGROUND_PATH_DESIGN_ID = new RegExp(`^backgrounds/(${UUID_SEGMENT})/`, "i");
/** Flat keys from `saveOutputPng` when using Supabase without structured design paths. */
const LEGACY_GENERATED_RE = /^legacy-generated\/[0-9a-f-]{36}\.png$/i;

export const isBannerAssetStoragePath = (path: string): boolean => {
  const trimmed = path.trim();
  return PATH_RE.test(trimmed) || LEGACY_GENERATED_RE.test(trimmed);
};

export const assertBackgroundPathForDesign = (path: string, designId: string): void => {
  if (!isBannerAssetStoragePath(path)) {
    throw new Error("Invalid background storage path.");
  }
  const normalized = path.trim();
  const expectedPrefix = `backgrounds/${designId}/`;
  if (!normalized.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
    throw new Error("Background path does not match design.");
  }
};

/** UUID folder segment under `backgrounds/{uuid}/…` (authoritative for persisted sessions). */
export const parseDesignIdFromBackgroundStoragePath = (storagePath: string): string | null => {
  const m = storagePath.trim().match(BACKGROUND_PATH_DESIGN_ID);
  return m ? m[1].toLowerCase() : null;
};

export const uuidStringsEqual = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export const newAssetFileName = (): string => `${randomUUID()}.png`;
