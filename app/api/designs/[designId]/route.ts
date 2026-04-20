import { NextResponse } from "next/server";
import { createSignedAssetUrl, getDesignDetailForEdit, isBannerDesignPersistenceEnabled } from "@/lib/bannerDesigns";
import { getSessionUserOrNull, isSupabaseSessionAuthConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ designId: string }>;
};

export const GET = async (_request: Request, context: RouteContext) => {
  if (!isBannerDesignPersistenceEnabled()) {
    return NextResponse.json({ error: "Design history is not configured on this server." }, { status: 503 });
  }
  if (!isSupabaseSessionAuthConfigured()) {
    return NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 503 });
  }

  const user = await getSessionUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { designId } = await context.params;
    const detail = await getDesignDetailForEdit(designId, user.id);
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
