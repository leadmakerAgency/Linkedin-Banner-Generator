import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredAsset {
  filename: string;
  publicUrl: string;
}

export const saveOutputPng = async (imageBuffer: Buffer): Promise<StoredAsset> => {
  const outputDirectory = path.join(process.cwd(), "public", "generated");
  await mkdir(outputDirectory, { recursive: true });

  const filename = `${randomUUID()}.png`;
  const outputPath = path.join(outputDirectory, filename);
  await writeFile(outputPath, imageBuffer);

  return {
    filename,
    publicUrl: `/generated/${filename}`
  };
};
