/** Removes only the `t` cache-bust query param; keeps other params (e.g. Supabase signed URL tokens). */
export const stripCacheBustParam = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed.includes("?")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const [pathOnly, query = ""] = trimmed.split("?");
    const params = new URLSearchParams(query);
    params.delete("t");
    const next = params.toString();
    return next ? `${pathOnly}?${next}` : pathOnly;
  }
  try {
    const url = new URL(trimmed);
    url.searchParams.delete("t");
    return url.toString();
  } catch {
    return trimmed;
  }
};
