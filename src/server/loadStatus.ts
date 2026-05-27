import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { directionFromHost, type Direction, DIRECTIONS } from "./directions";
import { getQueueStatus, type QueueStatus } from "./queue";
import { redirectTargetForRequest } from "./canonical";
import {
  getFerryFeed,
  HARBOR_BY_DIRECTION,
  type Catchability,
  type NextDeparture,
} from "./trafikverket";

export type LoadedStatus = {
  direction: Direction;
  question: string;
  status: QueueStatus | null;
  nextDepartures: NextDeparture[];
  liveAlerts: string[];
  fromHarbor: string;
  // Number of ferries the user is expected to miss given current queue. Null
  // when we have no queue status (Google failed). Drives the wait-line message
  // and the per-departure catch/maybe/miss labels — single source of truth.
  ferriesAhead: number | null;
};

const NEXT_DEPARTURES_COUNT = 9;

// Buckets mirror the existing wait-line copy in routes/index.tsx (see
// ferryEstimateLine). Delay rounded to whole minutes, same as before.
function ferriesAheadFromDelay(delaySec: number): number {
  const min = Math.max(0, Math.round(delaySec / 60));
  if (min <= 2) return 0;
  if (min <= 4) return 1;
  if (min <= 7) return 2;
  if (min <= 10) return 3;
  if (min <= 15) return 4;
  return 5;
}

// Security headers applied to SSR'd HTML. Matching rules for static assets
// live in public/_headers — defense in depth.
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "geolocation=(), microphone=(), camera=(), interest-cohort=()",
};

export const loadStatus = createServerFn({ method: "GET" }).handler(async (): Promise<LoadedStatus> => {
  const request = getRequest();

  // Non-canonical hosts (IDN, www) 301 to ASCII apex before we do any work.
  const redirectTarget = redirectTargetForRequest(request);
  if (redirectTarget) {
    throw redirect({ href: redirectTarget, statusCode: 301 });
  }

  const host = request?.headers.get("host") ?? null;
  // Local dev convenience: default to to-hono when host doesn't resolve.
  const direction = directionFromHost(host) ?? "to-hono";
  const [status, feed] = await Promise.all([
    getQueueStatus(direction),
    getFerryFeed(direction, new Date(), NEXT_DEPARTURES_COUNT),
  ]);

  const ferriesAhead = status
    ? ferriesAheadFromDelay(status.durationSec - status.staticDurationSec)
    : null;
  const nextDepartures =
    ferriesAhead == null
      ? feed.departures
      : feed.departures.map<NextDeparture>((d, i) => ({
          ...d,
          // No queue (ferriesAhead === 0) ⇒ everything's green. "Hinner kanske"
          // only marks the boundary departure when there's a real wait.
          catchability: (ferriesAhead === 0
            ? "catch"
            : i < ferriesAhead
              ? "miss"
              : i === ferriesAhead
                ? "maybe"
                : "catch") satisfies Catchability,
        }));

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    setResponseHeader(name, value);
  }

  return {
    direction,
    question: DIRECTIONS[direction].question,
    status,
    nextDepartures,
    liveAlerts: feed.liveAlerts,
    fromHarbor: HARBOR_BY_DIRECTION[direction].fromName,
    ferriesAhead,
  };
});
