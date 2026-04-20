import { NextResponse } from "next/server";
import {
  buildBackgroundOnlyPngBuffer,
  parseBannerInput,
  runBackgroundOnlyGeneration
} from "@/lib/generateBanner";
import { isBannerDesignPersistenceEnabled, persistNewDesignAfterBackgroundPng } from "@/lib/bannerDesigns";
import { getPersistOwnerOrErrorResponse } from "@/lib/requirePersistAuth";
import { appendCacheBustParam } from "@/lib/stripCacheBust";

export const runtime = "nodejs";

/** Regenerates GPT background only (revision patch). Client merges overlay via /api/render-overlay. */
export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    if (!formData.get("revisionAction")) {
      return NextResponse.json({ error: "revisionAction is required." }, { status: 400 });
    }

    const { values, primaryLogo, secondaryLogo, promptSnapshot } = parseBannerInput(formData);

    if (isBannerDesignPersistenceEnabled()) {
      const owner = await getPersistOwnerOrErrorResponse();
      if (!owner.ok) {
        return owner.response;
      }
      const basePngBuffer = await buildBackgroundOnlyPngBuffer(values, primaryLogo, secondaryLogo);
      const { designId, backgroundStoragePath, backgroundSignedUrl } = await persistNewDesignAfterBackgroundPng({
        ownerUserId: owner.userId,
        values,
        promptSnapshot,
        layoutOverlay: null,
        backgroundPng: basePngBuffer,
        source: "revise"
      });

      const busted = appendCacheBustParam(backgroundSignedUrl);
      return NextResponse.json({
        backgroundUrl: busted,
        imageUrl: busted,
        filename: backgroundStoragePath.split("/").pop() ?? "background.png",
        designId,
        backgroundStoragePath
      });
    }

    const output = await runBackgroundOnlyGeneration(values, primaryLogo, secondaryLogo);

    const busted = appendCacheBustParam(output.imageUrl);
    return NextResponse.json({
      backgroundUrl: busted,
      imageUrl: busted,
      filename: output.filename
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revise banner.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
