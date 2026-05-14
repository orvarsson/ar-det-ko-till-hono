export type Direction = "to-hono" | "to-varholmen";

export type DirectionConfig = {
  direction: Direction;
  question: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
};

// Coordinates picked just before the ferry queue typically begins to form.
// Verify on Google Maps if the queue signal looks noisy.
export const DIRECTIONS: Record<Direction, DirectionConfig> = {
  "to-hono": {
    direction: "to-hono",
    question: "Är det kö till Hönö?",
    origin: { lat: 57.7236, lng: 11.7889, label: "ICA Maxi Torslanda" },
    destination: { lat: 57.7095, lng: 11.7327, label: "Lilla Varholmens färjeläge" },
  },
  "to-varholmen": {
    direction: "to-varholmen",
    question: "Är det kö till Varholmen?",
    origin: { lat: 57.6892, lng: 11.6473, label: "Tappen, Hönö" },
    destination: { lat: 57.7044, lng: 11.7150, label: "Hönö färjeläge" },
  },
};

// Both human-readable and Punycode forms. Cloudflare passes the canonical zone
// form in the Host header, which depends on how the domain was added.
const HONO_HOSTS = new Set([
  "ärdetkötillhönö.se",
  "xn--rdetktillhn-k8a3vfb.se",
  "www.ärdetkötillhönö.se",
  "www.xn--rdetktillhn-k8a3vfb.se",
]);

const VARHOLMEN_HOSTS = new Set([
  "ärdetkötillvarholmen.se",
  "xn--rdetktillvarholmen-ktb97a.se",
  "www.ärdetkötillvarholmen.se",
  "www.xn--rdetktillvarholmen-ktb97a.se",
]);

export function directionFromHost(host: string | null | undefined): Direction | null {
  if (!host) return null;
  const normalized = host.toLowerCase().split(":")[0];
  if (HONO_HOSTS.has(normalized)) return "to-hono";
  if (VARHOLMEN_HOSTS.has(normalized)) return "to-varholmen";
  // Loose fallbacks for staging/preview hosts that carry a recognizable token.
  if (normalized.includes("varholmen")) return "to-varholmen";
  if (normalized.includes("hön") || normalized.includes("rdetktillhn")) return "to-hono";
  return null;
}
