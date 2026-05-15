import { env } from "cloudflare:workers";
import { DIRECTIONS, type Direction } from "./directions";
import { fetchRouteSample } from "./google";

export type QueueStatus = {
  status: "Ja" | "Nej";
  durationSec: number;
  staticDurationSec: number;
  fetchedAt: string;
  stale?: boolean;
};

const FRESH_TTL_SEC = 300; // 5 minutes — primary cache window
const LAST_GOOD_TTL_SEC = 60 * 60 * 6; // 6 hours — fallback if Google fails

function cacheKey(direction: Direction): string {
  return `queue:${direction}`;
}

function lastGoodKey(direction: Direction): string {
  return `queue:last-good:${direction}`;
}

function computeStatus(
  durationSec: number,
  staticDurationSec: number,
): "Ja" | "Nej" {
  return durationSec > staticDurationSec ? "Ja" : "Nej";
}

export async function getQueueStatus(
  direction: Direction,
): Promise<QueueStatus | null> {
  const config = DIRECTIONS[direction];
  const kv = (env as unknown as { QUEUE_CACHE?: KVNamespace }).QUEUE_CACHE;
  const apiKey = (env as unknown as { GOOGLE_MAPS_API_KEY?: string })
    .GOOGLE_MAPS_API_KEY;

  if (kv) {
    const cached = await kv.get<QueueStatus>(cacheKey(direction), "json");
    if (cached) return cached;
  }

  if (!apiKey) {
    // No key configured — try last-good then bail.
    if (kv) {
      const lastGood = await kv.get<QueueStatus>(
        lastGoodKey(direction),
        "json",
      );
      if (lastGood) return { ...lastGood, stale: true };
    }
    return null;
  }

  try {
    const sample = await fetchRouteSample(config, apiKey);
    console.log("sample:", sample);
    const fresh: QueueStatus = {
      status: computeStatus(sample.durationSec, sample.staticDurationSec),
      durationSec: sample.durationSec,
      staticDurationSec: sample.staticDurationSec,
      fetchedAt: new Date().toISOString(),
    };
    if (kv) {
      await Promise.all([
        kv.put(cacheKey(direction), JSON.stringify(fresh), {
          expirationTtl: FRESH_TTL_SEC,
        }),
        kv.put(lastGoodKey(direction), JSON.stringify(fresh), {
          expirationTtl: LAST_GOOD_TTL_SEC,
        }),
      ]);
    }
    return fresh;
  } catch (error) {
    console.error(`[queue] Routes API failed for ${direction}:`, error);
    if (kv) {
      const lastGood = await kv.get<QueueStatus>(
        lastGoodKey(direction),
        "json",
      );
      if (lastGood) return { ...lastGood, stale: true };
    }
    return null;
  }
}
