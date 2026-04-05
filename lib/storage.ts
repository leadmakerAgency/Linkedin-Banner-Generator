import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredAsset {
  filename: string;
  publicUrl: string;
}

export const saveOutputPng = async (imageBuffer: Buffer): Promise<StoredAsset> => {
  const filename = `${randomUUID()}.png`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (process.env.VERCEL && !token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add a Vercel Blob store token in Project Settings → Environment Variables."
    );
  }

  if (token) {
    const blob = await put(`generated/${filename}`, imageBuffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      token
    });

    return {
      filename,
      publicUrl: blob.url
    };
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
