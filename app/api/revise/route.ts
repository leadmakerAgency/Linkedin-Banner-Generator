import { NextResponse } from "next/server";
import { parseBannerInput, runBackgroundOnlyGeneration } from "@/lib/generateBanner";

export const runtime = "nodejs";

/** Regenerates GPT background only (revision patch). Client merges overlay via /api/render-overlay. */
export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    if (!formData.get("revisionAction")) {
      return NextResponse.json({ error: "revisionAction is required." }, { status: 400 });
    }

    const { values, primaryLogo, secondaryLogo } = parseBannerInput(formData);
    const output = await runBackgroundOnlyGeneration(values, primaryLogo, secondaryLogo);

    return NextResponse.json({
      backgroundUrl: `${output.imageUrl}?t=${Date.now()}`,
      imageUrl: `${output.imageUrl}?t=${Date.now()}`,
      filename: output.filename
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revise banner.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
