import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { directionFromHost, type Direction, DIRECTIONS } from "./directions";
import { getQueueStatus, type QueueStatus } from "./queue";

export type LoadedStatus = {
  direction: Direction;
  question: string;
  status: QueueStatus | null;
};

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
  const host = request?.headers.get("host") ?? null;
  // Local dev convenience: default to to-hono when host doesn't resolve.
  const direction = directionFromHost(host) ?? "to-hono";
  const status = await getQueueStatus(direction);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    setResponseHeader(name, value);
  }

  return {
    direction,
    question: DIRECTIONS[direction].question,
    status,
  };
});
