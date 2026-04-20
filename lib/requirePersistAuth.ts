import { NextResponse } from "next/server";
import { isBannerDesignPersistenceEnabled } from "@/lib/bannerDesigns";
import { getSessionUserOrNull, isSupabaseSessionAuthConfigured } from "@/lib/supabase/server";

export type PersistOwnerResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export const getPersistOwnerOrErrorResponse = async (): Promise<PersistOwnerResult> => {
  if (!isBannerDesignPersistenceEnabled()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Design persistence is not enabled on this server." }, { status: 503 })
    };
  }
  if (!isSupabaseSessionAuthConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        },
        { status: 503 }
      )
    };
  }
  const user = await getSessionUserOrNull();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in to save designs to your account." }, { status: 401 })
    };
  }
  return { ok: true, userId: user.id };
};
