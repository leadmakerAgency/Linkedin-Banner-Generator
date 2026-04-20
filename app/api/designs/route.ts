import { NextResponse } from "next/server";
import { createSignedAssetUrl, isBannerDesignPersistenceEnabled, listDesignsForHistory } from "@/lib/bannerDesigns";
import { getSessionUserOrNull, isSupabaseSessionAuthConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const GET = async () => {
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
    const rows = await listDesignsForHistory(50, user.id);
    const designs = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        banner_type: row.banner_type,
        updated_at: row.updated_at,
        previewUrl: row.latest_preview_path ? await createSignedAssetUrl(row.latest_preview_path) : null
      }))
    );
    return NextResponse.json({ designs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list designs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
