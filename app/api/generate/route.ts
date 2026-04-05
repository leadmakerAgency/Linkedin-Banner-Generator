import { NextResponse } from "next/server";
import { parseBannerInput, runBannerGeneration } from "@/lib/generateBanner";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const { values, primaryLogo, secondaryLogo } = parseBannerInput(formData);
    const output = await runBannerGeneration(values, primaryLogo, secondaryLogo);

    return NextResponse.json({
      imageUrl: `${output.imageUrl}?t=${Date.now()}`,
      filename: output.filename,
      layoutOverlay: output.layoutOverlay
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate banner.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
