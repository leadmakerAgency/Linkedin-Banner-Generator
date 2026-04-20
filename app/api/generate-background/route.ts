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

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
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
        source: "gpt"
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
    const message = error instanceof Error ? error.message : "Failed to generate background.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
