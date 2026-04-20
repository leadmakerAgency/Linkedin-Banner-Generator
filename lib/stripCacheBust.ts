/**
 * Appends or replaces cache-bust query param `t` without breaking URLs that already have a query string
 * (e.g. Supabase signed URLs use `?token=...` — must use `&t=`, not a second `?`).
 */
export const appendCacheBustParam = (raw: string, nonce: number = Date.now()): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const questionIndex = trimmed.indexOf("?");
    if (questionIndex === -1) {
      return `${trimmed}?t=${nonce}`;
    }
    const base = trimmed.slice(0, questionIndex);
    const query = trimmed.slice(questionIndex + 1);
    const params = new URLSearchParams(query);
    params.set("t", String(nonce));
    return `${base}?${params.toString()}`;
  }
  try {
    const url = new URL(trimmed);
    url.searchParams.set("t", String(nonce));
    return url.toString();
  } catch {
    return trimmed.includes("?") ? `${trimmed}&t=${nonce}` : `${trimmed}?t=${nonce}`;
  }
};

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
