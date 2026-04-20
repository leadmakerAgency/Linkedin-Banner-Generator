import { NextResponse } from "next/server";
import { getMaxImportImageBytes, fetchRemoteImageSafely } from "@/lib/backgroundImport";
import { normalizeBackgroundBuffer, parseBannerInput } from "@/lib/generateBanner";
import { isBannerDesignPersistenceEnabled, persistNewDesignAfterBackgroundPng } from "@/lib/bannerDesigns";
import { saveOutputPng } from "@/lib/storage";
import { getBannerDimensions, type BannerType } from "@/types/banner";

export const runtime = "nodejs";

const isValidBannerType = (value: string): value is BannerType => {
  return value === "personal" || value === "corporate";
};

const isHexColor = (value: string): boolean => {
  return /^#([A-Fa-f0-9]{6})$/.test(value);
};

const parseOptionalNonEmptyString = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalFile = (value: FormDataEntryValue | null): File | null => {
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return null;
};

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const bannerTypeRaw = parseOptionalNonEmptyString(formData.get("bannerType"));
    const secondaryBrandColor = parseOptionalNonEmptyString(formData.get("secondaryBrandColor"));
    const sourceFile = parseOptionalFile(formData.get("file"));
    const sourceUrl = parseOptionalNonEmptyString(formData.get("imageUrl"));

    if (!bannerTypeRaw || !isValidBannerType(bannerTypeRaw)) {
      return NextResponse.json({ error: "Valid bannerType is required." }, { status: 400 });
    }

    if (!secondaryBrandColor || !isHexColor(secondaryBrandColor)) {
      return NextResponse.json({ error: "Valid secondaryBrandColor is required." }, { status: 400 });
    }

    if ((sourceFile ? 1 : 0) + (sourceUrl ? 1 : 0) !== 1) {
      return NextResponse.json(
        { error: "Provide exactly one image source: file or imageUrl." },
        { status: 400 }
      );
    }

    let sourceBuffer: Buffer;
    if (sourceFile) {
      if (sourceFile.size > getMaxImportImageBytes()) {
        return NextResponse.json({ error: "Imported file is too large." }, { status: 400 });
      }
      sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());
    } else {
      const remoteImage = await fetchRemoteImageSafely(sourceUrl ?? "");
      sourceBuffer = remoteImage.buffer;
    }

    const { width, height } = getBannerDimensions(bannerTypeRaw);
    const normalizedPng = await normalizeBackgroundBuffer(sourceBuffer, secondaryBrandColor, width, height);

    if (isBannerDesignPersistenceEnabled()) {
      const { values, promptSnapshot } = parseBannerInput(formData);
      if (values.bannerType !== bannerTypeRaw) {
        return NextResponse.json({ error: "bannerType mismatch between form and import." }, { status: 400 });
      }

      const { designId, backgroundStoragePath, backgroundSignedUrl } = await persistNewDesignAfterBackgroundPng({
        values,
        promptSnapshot,
        layoutOverlay: null,
        backgroundPng: normalizedPng,
        source: "import"
      });

      return NextResponse.json({
        backgroundUrl: `${backgroundSignedUrl}?t=${Date.now()}`,
        filename: backgroundStoragePath.split("/").pop() ?? "background.png",
        designId,
        backgroundStoragePath
      });
    }

    const stored = await saveOutputPng(normalizedPng);

    return NextResponse.json({
      backgroundUrl: `${stored.publicUrl}?t=${Date.now()}`,
      filename: stored.filename
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import background image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
