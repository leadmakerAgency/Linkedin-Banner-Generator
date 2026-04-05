import { NextResponse } from "next/server";
import { isTrustedBackgroundHttpsUrl } from "@/lib/backgroundSource";
import { parseBannerInput, runOverlayRender } from "@/lib/generateBanner";
import type { BannerGenerationInput } from "@/types/banner";

export const runtime = "nodejs";

const isValidBackgroundRef = (raw: string): boolean => {
  const base = raw.split("?")[0] ?? raw;
  if (base.startsWith("/generated/")) {
    return true;
  }
  return isTrustedBackgroundHttpsUrl(base);
};

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const rawBackground = formData.get("backgroundUrl");
    if (typeof rawBackground !== "string" || !isValidBackgroundRef(rawBackground)) {
      return NextResponse.json(
        { error: "backgroundUrl is required and must be a /generated/... path or a Vercel Blob URL." },
        { status: 400 }
      );
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
      filename: output.filename,
      layoutOverlay: output.layoutOverlay
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render overlay.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
