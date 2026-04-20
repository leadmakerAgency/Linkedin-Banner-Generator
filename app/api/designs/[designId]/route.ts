import { NextResponse } from "next/server";
import { createSignedAssetUrl, designsApiSecretOk, getDesignDetailForEdit } from "@/lib/bannerDesigns";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ designId: string }>;
};

export const GET = async (request: Request, context: RouteContext) => {
  if (!designsApiSecretOk(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { designId } = await context.params;
    const detail = await getDesignDetailForEdit(designId);
    const backgroundSignedUrl = await createSignedAssetUrl(detail.backgroundStoragePath);
    const primaryLogoSignedUrl = detail.primaryLogoPath ? await createSignedAssetUrl(detail.primaryLogoPath) : null;
    const secondaryLogoSignedUrl = detail.secondaryLogoPath ? await createSignedAssetUrl(detail.secondaryLogoPath) : null;

    return NextResponse.json({
      designId: detail.designId,
      backgroundStoragePath: detail.backgroundStoragePath,
      backgroundSignedUrl,
      snapshot: detail.snapshot,
      primaryLogoSignedUrl,
      secondaryLogoSignedUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load design.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
};
