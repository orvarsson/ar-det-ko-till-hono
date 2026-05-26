import { directionFromHost, type Direction } from "./directions";

// ASCII apex per direction = the single canonical home. Anything else
// (IDN, www) that maps to the same direction is non-canonical and
// 301-redirects here.
const CANONICAL_HOST: Record<Direction, string> = {
  "to-hono": "ardetkotillhono.se",
  "to-varholmen": "ardetkotillvarholmen.se",
};

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  return host.toLowerCase().split(":")[0];
}

export function canonicalForRequest(request: Request | undefined): string {
  const host = normalizeHost(request?.headers.get("host") ?? null);
  const direction = directionFromHost(host) ?? "to-hono";
  return `https://${CANONICAL_HOST[direction]}`;
}

/**
 * If the incoming request should be redirected to its canonical ASCII apex,
 * returns the absolute target URL (preserving path + query). Returns null
 * when the request is already canonical (or the host doesn't map to a
 * known direction).
 */
export function redirectTargetForRequest(
  request: Request | undefined,
): string | null {
  if (!request) return null;
  const host = normalizeHost(request.headers.get("host"));
  if (!host) return null;
  const direction = directionFromHost(host);
  if (!direction) return null;
  const canonical = CANONICAL_HOST[direction];
  if (host === canonical) return null;
  let path = "/";
  let search = "";
  try {
    const url = new URL(request.url);
    path = url.pathname || "/";
    search = url.search;
  } catch {
    // fall through to defaults
  }
  return `https://${canonical}${path}${search}`;
}
