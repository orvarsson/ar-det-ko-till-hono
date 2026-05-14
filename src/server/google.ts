import type { DirectionConfig } from "./directions";

const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

export type RouteSample = {
  durationSec: number;
  staticDurationSec: number;
};

function parseDurationSec(raw: unknown): number {
  if (typeof raw !== "string") throw new Error(`Unexpected duration value: ${String(raw)}`);
  // Routes API returns strings like "742s".
  const value = Number.parseInt(raw.replace(/s$/, ""), 10);
  if (!Number.isFinite(value)) throw new Error(`Could not parse duration: ${raw}`);
  return value;
}

export async function fetchRouteSample(
  config: DirectionConfig,
  apiKey: string,
): Promise<RouteSample> {
  const body = {
    origin: {
      location: {
        latLng: { latitude: config.origin.lat, longitude: config.origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: config.destination.lat, longitude: config.destination.lng },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: new Date().toISOString(),
  };

  const response = await fetch(ROUTES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Routes API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    routes?: Array<{ duration?: string; staticDuration?: string }>;
  };

  const route = data.routes?.[0];
  if (!route) throw new Error("Routes API returned no routes");

  return {
    durationSec: parseDurationSec(route.duration),
    staticDurationSec: parseDurationSec(route.staticDuration),
  };
}
