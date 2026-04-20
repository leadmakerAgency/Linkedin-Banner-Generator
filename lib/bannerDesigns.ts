import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BannerFormValues, BannerGenerationInput, LayoutOverlayPayload } from "@/types/banner";
import type { DesignSnapshotJson } from "@/types/designSnapshot";
import { assertBackgroundPathForDesign, isBannerAssetStoragePath, newAssetFileName } from "@/lib/bannerAssetPath";
import { BANNER_ASSETS_BUCKET, BANNER_ASSET_SIGNED_URL_TTL_SEC } from "@/lib/bannerDesignConstants";
import { createSupabaseServiceRoleClient, isSupabaseServiceConfigured } from "@/lib/supabaseAdmin";

export const isBannerDesignPersistenceEnabled = (): boolean => isSupabaseServiceConfigured();

const getClient = (): SupabaseClient => createSupabaseServiceRoleClient();

export const uploadBannerPng = async (objectPath: string, buffer: Buffer): Promise<void> => {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BANNER_ASSETS_BUCKET).upload(objectPath, buffer, {
    contentType: "image/png",
    upsert: false
  });
  if (error) {
    throw new Error(error.message || "Failed to upload asset to storage.");
  }
};

export const createSignedAssetUrl = async (objectPath: string): Promise<string> => {
  if (!isBannerAssetStoragePath(objectPath)) {
    throw new Error("Invalid storage path for signing.");
  }
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BANNER_ASSETS_BUCKET)
    .createSignedUrl(objectPath, BANNER_ASSET_SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create signed URL.");
  }
  return data.signedUrl;
};

export const downloadBannerPng = async (objectPath: string): Promise<Buffer> => {
  if (!isBannerAssetStoragePath(objectPath)) {
    throw new Error("Invalid storage path for download.");
  }
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BANNER_ASSETS_BUCKET).download(objectPath);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download asset.");
  }
  return Buffer.from(await data.arrayBuffer());
};

export const buildDesignTitle = (companyName: string): string => {
  const trimmed = companyName.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "Untitled";
};

export const toPersistedFormValues = (values: BannerGenerationInput): BannerFormValues => {
  const { revisionAction, regenerateNonce, ...rest } = values;
  void revisionAction;
  void regenerateNonce;
  return rest;
};

export const persistNewDesignAfterBackgroundPng = async (params: {
  ownerUserId: string;
  values: BannerGenerationInput;
  promptSnapshot: string;
  layoutOverlay: LayoutOverlayPayload | null;
  backgroundPng: Buffer;
  source: "gpt" | "import" | "revise";
}): Promise<{ designId: string; backgroundStoragePath: string; backgroundSignedUrl: string }> => {
  const designId = randomUUID();
  const bgFile = newAssetFileName();
  const path = `backgrounds/${designId}/${bgFile}`;
  await uploadBannerPng(path, params.backgroundPng);

  const snapshot: DesignSnapshotJson = {
    form: toPersistedFormValues(params.values),
    promptSnapshot: params.promptSnapshot,
    layoutOverlay: params.layoutOverlay
  };

  await insertDesignWithBackgroundVersion({
    ownerUserId: params.ownerUserId,
    designId,
    title: buildDesignTitle(params.values.companyName),
    bannerType: params.values.bannerType,
    backgroundStoragePath: path,
    source: params.source,
    snapshot
  });

  const backgroundSignedUrl = await createSignedAssetUrl(path);
  return { designId, backgroundStoragePath: path, backgroundSignedUrl };
};

export const insertDesignWithBackgroundVersion = async (input: {
  ownerUserId: string;
  designId: string;
  title: string;
  bannerType: BannerFormValues["bannerType"];
  backgroundStoragePath: string;
  source: "gpt" | "import" | "revise";
  snapshot: DesignSnapshotJson;
}): Promise<void> => {
  const supabase = getClient();
  assertBackgroundPathForDesign(input.backgroundStoragePath, input.designId);

  const { error: designError } = await supabase.from("banner_designs").insert({
    id: input.designId,
    owner_user_id: input.ownerUserId,
    title: input.title,
    banner_type: input.bannerType,
    background_storage_path: input.backgroundStoragePath,
    source: input.source
  });
  if (designError) {
    throw new Error(designError.message);
  }

  const { error: versionError } = await supabase.from("banner_design_versions").insert({
    design_id: input.designId,
    version: 1,
    snapshot: input.snapshot,
    preview_storage_path: null,
    primary_logo_storage_path: null,
    secondary_logo_storage_path: null
  });
  if (versionError) {
    throw new Error(versionError.message);
  }
};

const parseVersionNumber = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const isUniqueViolation = (message: string, code?: string): boolean => {
  if (code === "23505") {
    return true;
  }
  const lower = message.toLowerCase();
  return lower.includes("duplicate key") && lower.includes("unique constraint");
};

export const appendOverlayVersion = async (input: {
  ownerUserId: string;
  designId: string;
  snapshot: DesignSnapshotJson;
  previewPng: Buffer;
  primaryLogoBuffer: Buffer | null;
  secondaryLogoBuffer: Buffer | null;
}): Promise<{ version: number; previewStoragePath: string }> => {
  const supabase = getClient();
  const { data: owned, error: ownedError } = await supabase
    .from("banner_designs")
    .select("id")
    .eq("id", input.designId)
    .eq("owner_user_id", input.ownerUserId)
    .maybeSingle();

  if (ownedError) {
    throw new Error(ownedError.message);
  }
  if (!owned) {
    throw new Error("Design not found.");
  }

  const maxAttempts = 12;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: maxRow, error: maxError } = await supabase
      .from("banner_design_versions")
      .select("version")
      .eq("design_id", input.designId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      throw new Error(maxError.message);
    }

    const nextVersion = parseVersionNumber(maxRow?.version) + 1;
    const previewPath = `previews/${input.designId}/${newAssetFileName()}`;
    await uploadBannerPng(previewPath, input.previewPng);

    let primaryLogoStoragePath: string | null = null;
    let secondaryLogoStoragePath: string | null = null;

    if (input.primaryLogoBuffer) {
      primaryLogoStoragePath = `logos/${input.designId}/${randomUUID()}-primary.png`;
      await uploadBannerPng(primaryLogoStoragePath, input.primaryLogoBuffer);
    }
    if (input.secondaryLogoBuffer) {
      secondaryLogoStoragePath = `logos/${input.designId}/${randomUUID()}-secondary.png`;
      await uploadBannerPng(secondaryLogoStoragePath, input.secondaryLogoBuffer);
    }

    const { error: versionError } = await supabase.from("banner_design_versions").insert({
      design_id: input.designId,
      version: nextVersion,
      snapshot: input.snapshot,
      preview_storage_path: previewPath,
      primary_logo_storage_path: primaryLogoStoragePath,
      secondary_logo_storage_path: secondaryLogoStoragePath
    });

    if (!versionError) {
      return { version: nextVersion, previewStoragePath: previewPath };
    }

    const msg = versionError.message ?? "";
    if (isUniqueViolation(msg, versionError.code) && attempt < maxAttempts - 1) {
      continue;
    }
    throw new Error(msg || "Failed to save overlay version.");
  }

  throw new Error("Failed to allocate a new overlay version after repeated conflicts.");
};

export const listDesignsForHistory = async (
  limit: number,
  ownerUserId: string
): Promise<
  Array<{
    id: string;
    title: string;
    banner_type: string;
    updated_at: string;
    latest_preview_path: string | null;
    latest_version: number;
  }>
> => {
  const supabase = getClient();
  const { data: designs, error: designsError } = await supabase
    .from("banner_designs")
    .select("id, title, banner_type, updated_at")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (designsError || !designs) {
    throw new Error(designsError?.message ?? "Failed to list designs.");
  }

  const results: Array<{
    id: string;
    title: string;
    banner_type: string;
    updated_at: string;
    latest_preview_path: string | null;
    latest_version: number;
  }> = [];

  for (const row of designs) {
    const { data: v, error: vError } = await supabase
      .from("banner_design_versions")
      .select("version, preview_storage_path")
      .eq("design_id", row.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vError) {
      throw new Error(vError.message);
    }

    results.push({
      id: row.id,
      title: row.title,
      banner_type: row.banner_type,
      updated_at: row.updated_at,
      latest_preview_path: v?.preview_storage_path ?? null,
      latest_version: v?.version ?? 0
    });
  }

  return results;
};

export const getDesignDetailForEdit = async (
  designId: string,
  ownerUserId: string
): Promise<{
  designId: string;
  backgroundStoragePath: string;
  snapshot: DesignSnapshotJson;
  primaryLogoPath: string | null;
  secondaryLogoPath: string | null;
}> => {
  const supabase = getClient();
  const { data: design, error: designError } = await supabase
    .from("banner_designs")
    .select("id, background_storage_path")
    .eq("id", designId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (designError || !design) {
    throw new Error(designError?.message ?? "Design not found.");
  }

  const { data: version, error: versionError } = await supabase
    .from("banner_design_versions")
    .select("snapshot, primary_logo_storage_path, secondary_logo_storage_path, version")
    .eq("design_id", designId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError || !version) {
    throw new Error(versionError?.message ?? "No versions for design.");
  }

  const snapshot = version.snapshot as DesignSnapshotJson;
  if (!snapshot?.form) {
    throw new Error("Invalid snapshot payload.");
  }

  return {
    designId: design.id,
    backgroundStoragePath: design.background_storage_path,
    snapshot,
    primaryLogoPath: version.primary_logo_storage_path,
    secondaryLogoPath: version.secondary_logo_storage_path
  };
};
