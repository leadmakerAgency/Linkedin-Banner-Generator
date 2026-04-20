import { NextResponse } from "next/server";
import { assertBackgroundPathForDesign } from "@/lib/bannerAssetPath";
import { resolveBackgroundBufferForOverlay } from "@/lib/bannerBackgroundLoader";
import { isTrustedBackgroundHttpsUrl, isTrustedSupabaseStorageObjectUrl } from "@/lib/backgroundSource";
import {
  appendOverlayVersion,
  createSignedAssetUrl,
  isBannerDesignPersistenceEnabled,
  toPersistedFormValues
} from "@/lib/bannerDesigns";
import {
  composeOverlayFromBannerBuffer,
  parseBannerInput,
  runOverlayRender
} from "@/lib/generateBanner";
import type { BannerGenerationInput } from "@/types/banner";
import { stripCacheBustParam } from "@/lib/stripCacheBust";

export const runtime = "nodejs";

const isValidLegacyBackgroundRef = (raw: string): boolean => {
  const base = stripCacheBustParam(raw);
  if (base.startsWith("/generated/")) {
    return true;
  }
  return isTrustedBackgroundHttpsUrl(base) || isTrustedSupabaseStorageObjectUrl(base);
};

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const { values, primaryLogo, secondaryLogo, promptSnapshot, designId, backgroundStoragePath } =
      parseBannerInput(formData);

    const overlayValues: BannerGenerationInput = {
      ...values,
      revisionAction: undefined,
      regenerateNonce: undefined
    };

    const persistOverlay =
      isBannerDesignPersistenceEnabled() && Boolean(designId && backgroundStoragePath);

    if (persistOverlay) {
      assertBackgroundPathForDesign(backgroundStoragePath!, designId!);
      const backgroundUrlRaw = formData.get("backgroundUrl");
      const buffer = await resolveBackgroundBufferForOverlay({
        backgroundStoragePath,
        backgroundUrl: typeof backgroundUrlRaw === "string" ? backgroundUrlRaw : null
      });

      const primaryBuf = primaryLogo ? Buffer.from(await primaryLogo.arrayBuffer()) : null;
      const secondaryBuf = secondaryLogo ? Buffer.from(await secondaryLogo.arrayBuffer()) : null;
      const primaryForRender =
        primaryBuf && primaryLogo
          ? new File([primaryBuf], primaryLogo.name || "primary.png", { type: primaryLogo.type || "image/png" })
          : null;
      const secondaryForRender =
        secondaryBuf && secondaryLogo
          ? new File([secondaryBuf], secondaryLogo.name || "secondary.png", { type: secondaryLogo.type || "image/png" })
          : null;

      const { pngBuffer, layoutOverlay } = await composeOverlayFromBannerBuffer(
        buffer,
        overlayValues,
        primaryForRender,
        secondaryForRender
      );

      const { previewStoragePath } = await appendOverlayVersion({
        designId: designId!,
        snapshot: {
          form: toPersistedFormValues(overlayValues),
          promptSnapshot,
          layoutOverlay
        },
        previewPng: pngBuffer,
        primaryLogoBuffer: primaryBuf,
        secondaryLogoBuffer: secondaryBuf
      });

      const signedPreview = await createSignedAssetUrl(previewStoragePath);
      return NextResponse.json({
        imageUrl: `${signedPreview}?t=${Date.now()}`,
        filename: previewStoragePath.split("/").pop() ?? "preview.png",
        layoutOverlay,
        designId
      });
    }

    const rawBackground = formData.get("backgroundUrl");
    if (typeof rawBackground !== "string" || !isValidLegacyBackgroundRef(rawBackground)) {
      return NextResponse.json(
        { error: "backgroundUrl is required and must be a /generated/... path or a Vercel Blob URL." },
        { status: 400 }
      );
    }

    const backgroundUrl = stripCacheBustParam(rawBackground);
    const output = await runOverlayRender(backgroundUrl, overlayValues, primaryLogo, secondaryLogo);

    return NextResponse.json({
      imageUrl: `${output.imageUrl}?t=${Date.now()}`,
      filename: output.filename,
      layoutOverlay: output.layoutOverlay,
      designId: designId ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render overlay.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
