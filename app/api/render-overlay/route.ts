import { NextResponse } from "next/server";
import { parseBannerInput, runOverlayRender } from "@/lib/generateBanner";
import type { BannerGenerationInput } from "@/types/banner";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const rawBackground = formData.get("backgroundUrl");
    if (typeof rawBackground !== "string" || !rawBackground.startsWith("/generated/")) {
      return NextResponse.json({ error: "backgroundUrl is required and must be a /generated/... asset." }, { status: 400 });
    }

    const backgroundUrl = rawBackground.split("?")[0] ?? rawBackground;

    const { values, primaryLogo, secondaryLogo } = parseBannerInput(formData);
    const overlayValues: BannerGenerationInput = {
      ...values,
      revisionAction: undefined,
      regenerateNonce: undefined
    };

    const output = await runOverlayRender(backgroundUrl, overlayValues, primaryLogo, secondaryLogo);

    return NextResponse.json({
      imageUrl: `${output.imageUrl}?t=${Date.now()}`,
      filename: output.filename
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render overlay.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
