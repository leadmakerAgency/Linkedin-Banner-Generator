import { randomUUID } from "crypto";

const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(
  `^(backgrounds|previews|logos)/(${UUID_SEGMENT})/[a-zA-Z0-9._-]+\\.png$`,
  "i"
);

export const isBannerAssetStoragePath = (path: string): boolean => {
  const trimmed = path.trim();
  return PATH_RE.test(trimmed);
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

export const newAssetFileName = (): string => `${randomUUID()}.png`;
