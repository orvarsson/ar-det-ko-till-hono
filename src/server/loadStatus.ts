import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { directionFromHost, type Direction, DIRECTIONS } from "./directions";
import { getQueueStatus, type QueueStatus } from "./queue";

export type LoadedStatus = {
  direction: Direction;
  question: string;
  status: QueueStatus | null;
};

export const loadStatus = createServerFn({ method: "GET" }).handler(async (): Promise<LoadedStatus> => {
  const request = getRequest();
  const host = request?.headers.get("host") ?? null;
  // Local dev convenience: default to to-hono when host doesn't resolve.
  const direction = directionFromHost(host) ?? "to-hono";
  const status = await getQueueStatus(direction);

  return {
    direction,
    question: DIRECTIONS[direction].question,
    status,
  };
});
