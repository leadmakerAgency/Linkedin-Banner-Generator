import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createSignedAssetUrl, uploadBannerPng } from "@/lib/bannerDesigns";
import { isSupabaseServiceConfigured } from "@/lib/supabaseAdmin";

// Persisted banner PNGs: prefer Vercel Blob (stable public URLs) when configured; else Supabase; else local public/generated.
export interface StoredAsset {
  filename: string;
  publicUrl: string;
  /** Present when stored in Supabase `banner-assets` under a structured or legacy key. */
  storagePath?: string;
}

const uploadLegacySupabasePng = async (imageBuffer: Buffer): Promise<StoredAsset> => {
  const filename = `${randomUUID()}.png`;
  const objectPath = `legacy-generated/${filename}`;
  await uploadBannerPng(objectPath, imageBuffer);
  const signedUrl = await createSignedAssetUrl(objectPath);
  return { filename, publicUrl: signedUrl, storagePath: objectPath };
};

export const saveOutputPng = async (imageBuffer: Buffer): Promise<StoredAsset> => {
  const filename = `${randomUUID()}.png`;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const supabaseConfigured = isSupabaseServiceConfigured();

  if (process.env.VERCEL && !blobToken && !supabaseConfigured) {
    throw new Error(
      "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for Storage, or BLOB_READ_WRITE_TOKEN for Vercel Blob, in Project Settings → Environment Variables."
    );
  }

  if (blobToken) {
    const blob = await put(`generated/${filename}`, imageBuffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      token: blobToken
    });

    return {
      filename,
      publicUrl: blob.url
    };
  }

  if (supabaseConfigured) {
    return uploadLegacySupabasePng(imageBuffer);
  }

  const outputDirectory = path.join(process.cwd(), "public", "generated");
  await mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, filename);
  await writeFile(outputPath, imageBuffer);

  return {
    filename,
    publicUrl: `/generated/${filename}`
  };
};
