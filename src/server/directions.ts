export type Direction = "to-hono" | "to-varholmen";

export type DirectionConfig = {
  direction: Direction;
  question: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
};
//57.69856181724554, 11.666569049980469
// Coordinates picked just before the ferry queue typically begins to form.
// Verify on Google Maps if the queue signal looks noisy.
export const DIRECTIONS: Record<Direction, DirectionConfig> = {
  "to-hono": {
    direction: "to-hono",
    question: "Är det kö till Hönö?",
    origin: {
      lat: 57.71599983518791,
      lng: 11.79306801933427,
      label: "ICA Maxi Torslanda",
    },
    destination: {
      lat: 57.70889437433493,
      lng: 11.703745522175325,
      label: "Lilla Varholmens färjeläge",
    },
  },
  "to-varholmen": {
    direction: "to-varholmen",
    question: "Är det kö till Varholmen?",
    origin: {
      lat: 57.7016151793271,
      lng: 11.646704586211877,
      label: "Tappen, Hönö",
    },
    destination: {
      lat: 57.69856181724554,
      lng: 11.666569049980469,
      label: "Hönö färjeläge",
    },
  },
};

// All four forms per direction: ASCII apex+www (canonical), IDN Unicode+www,
// IDN Punycode+www. Cloudflare uses whichever form was attached as a custom
// domain when populating the Host header.
const HONO_HOSTS = new Set([
  "ardetkotillhono.se",
  "www.ardetkotillhono.se",
  "ärdetkötillhönö.se",
  "xn--rdetktillhn-k8a3vfb.se",
  "www.ärdetkötillhönö.se",
  "www.xn--rdetktillhn-k8a3vfb.se",
]);

const VARHOLMEN_HOSTS = new Set([
  "ardetkotillvarholmen.se",
  "www.ardetkotillvarholmen.se",
  "ärdetkötillvarholmen.se",
  "xn--rdetktillvarholmen-ktb97a.se",
  "www.ärdetkötillvarholmen.se",
  "www.xn--rdetktillvarholmen-ktb97a.se",
]);

export function directionFromHost(
  host: string | null | undefined,
): Direction | null {
  if (!host) {
    return null;
  }
  const normalized = host.toLowerCase().split(":")[0];

  if (HONO_HOSTS.has(normalized)) {
    return "to-hono";
  }

  if (VARHOLMEN_HOSTS.has(normalized)) {
    return "to-varholmen";
  }
  // Loose fallbacks for staging/preview hosts that carry a recognizable token.
  if (normalized.includes("varholmen")) {
    return "to-varholmen";
  }
  if (
    normalized.includes("hön") ||
    normalized.includes("rdetktillhn") ||
    normalized.includes("hono")
  ) {
    return "to-hono";
  }
  return null;
}
