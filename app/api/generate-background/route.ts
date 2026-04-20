import { NextResponse } from "next/server";
import {
  buildBackgroundOnlyPngBuffer,
  parseBannerInput,
  runBackgroundOnlyGeneration
} from "@/lib/generateBanner";
import { isBannerDesignPersistenceEnabled, persistNewDesignAfterBackgroundPng } from "@/lib/bannerDesigns";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const { values, primaryLogo, secondaryLogo, promptSnapshot } = parseBannerInput(formData);

    if (isBannerDesignPersistenceEnabled()) {
      const basePngBuffer = await buildBackgroundOnlyPngBuffer(values, primaryLogo, secondaryLogo);
      const { designId, backgroundStoragePath, backgroundSignedUrl } = await persistNewDesignAfterBackgroundPng({
        values,
        promptSnapshot,
        layoutOverlay: null,
        backgroundPng: basePngBuffer,
        source: "gpt"
      });

      return NextResponse.json({
        backgroundUrl: `${backgroundSignedUrl}?t=${Date.now()}`,
        imageUrl: `${backgroundSignedUrl}?t=${Date.now()}`,
        filename: backgroundStoragePath.split("/").pop() ?? "background.png",
        designId,
        backgroundStoragePath
      });
    }

    const output = await runBackgroundOnlyGeneration(values, primaryLogo, secondaryLogo);

    return NextResponse.json({
      backgroundUrl: `${output.imageUrl}?t=${Date.now()}`,
      imageUrl: `${output.imageUrl}?t=${Date.now()}`,
      filename: output.filename
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate background.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
