import { lookup } from "dns/promises";
import { isIP } from "net";

const MAX_REMOTE_IMAGE_BYTES = 12 * 1024 * 1024;
const REMOTE_FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const isPrivateIpv4 = (address: string): boolean => {
  const octets = address.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  if (a >= 224) {
    return true;
  }
  return false;
};

const isPrivateIpv6 = (address: string): boolean => {
  const normalized = address.toLowerCase();
  const mappedIndex = normalized.lastIndexOf("::ffff:");
  if (mappedIndex >= 0) {
    const mappedIpv4 = normalized.slice(mappedIndex + "::ffff:".length);
    if (isIP(mappedIpv4) === 4) {
      return isPrivateIpv4(mappedIpv4);
    }
  }
  if (normalized === "::1" || normalized === "::") {
    return true;
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }
  return false;
};

const isPrivateOrLocalIp = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) {
    return isPrivateIpv4(address);
  }
  if (family === 6) {
    return isPrivateIpv6(address);
  }
  return true;
};

const assertPublicHost = async (hostname: string): Promise<void> => {
  const normalizedHost = hostname.trim().toLowerCase();
  if (!normalizedHost || normalizedHost === "localhost") {
    throw new Error("URL host is not allowed.");
  }
  if (isIP(normalizedHost) > 0) {
    if (isPrivateOrLocalIp(normalizedHost)) {
      throw new Error("URL host resolves to a private or local address.");
    }
    return;
  }

  const records = await lookup(normalizedHost, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error("Unable to resolve URL host.");
  }

  for (const record of records) {
    if (isPrivateOrLocalIp(record.address)) {
      throw new Error("URL host resolves to a private or local address.");
    }
  }
};

const assertPublicImageUrl = async (rawUrl: string): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Image URL must use http or https.");
  }

  await assertPublicHost(parsed.hostname);
  return parsed;
};

const fetchWithRedirects = async (startUrl: URL, signal: AbortSignal): Promise<Response> => {
  let currentUrl = startUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicHost(currentUrl.hostname);

    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "LeadMakerHub-BackgroundImporter/1.0"
      }
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Redirected URL is missing a target.");
    }
    const nextUrl = new URL(location, currentUrl);
    if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
      throw new Error("Redirected URL protocol is not allowed.");
    }
    currentUrl = nextUrl;
  }

  throw new Error("Too many redirects while loading image URL.");
};

const readResponseBufferWithLimit = async (response: Response, maxBytes: number): Promise<Buffer> => {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = Number(contentLengthHeader);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new Error("Image is too large.");
    }
  }

  if (!response.body) {
    throw new Error("Image response body is empty.");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error("Image is too large.");
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
};

export interface RemoteImageResult {
  buffer: Buffer;
  mimeType: string;
}

export const fetchRemoteImageSafely = async (rawUrl: string): Promise<RemoteImageResult> => {
  const imageUrl = await assertPublicImageUrl(rawUrl);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, REMOTE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetchWithRedirects(imageUrl, timeoutController.signal);
    if (!response.ok) {
      throw new Error("Failed to download image from URL.");
    }

    const contentTypeRaw = response.headers.get("content-type") ?? "";
    const mimeType = contentTypeRaw.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!mimeType.startsWith("image/")) {
      throw new Error("URL does not point to an image.");
    }

    const buffer = await readResponseBufferWithLimit(response, MAX_REMOTE_IMAGE_BYTES);
    return { buffer, mimeType };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Image URL request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getMaxImportImageBytes = (): number => MAX_REMOTE_IMAGE_BYTES;
