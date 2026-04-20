import { NextResponse } from "next/server";
import { createSignedAssetUrl, designsApiSecretOk, listDesignsForHistory } from "@/lib/bannerDesigns";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  if (!designsApiSecretOk(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await listDesignsForHistory(50);
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
