import { directionFromHost, type Direction } from "./directions";

const CANONICAL_BY_DIRECTION: Record<Direction, string> = {
  "to-hono": "https://ärdetkötillhönö.se",
  "to-varholmen": "https://ärdetkötillvarholmen.se",
};

export function canonicalForRequest(request: Request | undefined): string {
  const host = request?.headers.get("host") ?? null;
  const direction = directionFromHost(host) ?? "to-hono";
  return CANONICAL_BY_DIRECTION[direction];
}
