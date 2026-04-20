import { NextResponse } from "next/server";
import { createSignedAssetUrl, isBannerDesignPersistenceEnabled, listDesignsForHistory } from "@/lib/bannerDesigns";
import { getSessionUserOrNull, isSupabaseSessionAuthConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

const parsePositiveInt = (raw: string | null, fallback: number, max: number): number => {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(n, max);
};

export const GET = async (request: Request) => {
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

  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  try {
    const { rows, total } = await listDesignsForHistory({
      ownerUserId: user.id,
      limit: pageSize,
      offset
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? 1 : Math.min(page, totalPages);

    const designs = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        banner_type: row.banner_type,
        updated_at: row.updated_at,
        previewUrl: row.latest_preview_path ? await createSignedAssetUrl(row.latest_preview_path) : null
      }))
    );

    return NextResponse.json({
      designs,
      page: effectivePage,
      pageSize,
      total,
      totalPages
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list designs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
