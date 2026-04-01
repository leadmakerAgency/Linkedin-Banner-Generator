import { NextResponse } from "next/server";
import { parseBannerInput, runBackgroundOnlyGeneration } from "@/lib/generateBanner";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const { values, primaryLogo, secondaryLogo } = parseBannerInput(formData);
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
