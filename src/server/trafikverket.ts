import { env } from "cloudflare:workers";
import type { Direction } from "./directions";

const FERRY_ROUTE_ID = 28; // Hönöleden
const HARBOR_HONO_ID = 55;
const HARBOR_VARHOLMEN_ID = 56;

export const HARBOR_BY_DIRECTION: Record<
  Direction,
  { fromId: number; fromName: string; toName: string }
> = {
  "to-hono": {
    fromId: HARBOR_VARHOLMEN_ID,
    fromName: "Lilla Varholmen",
    toName: "Hönö",
  },
  "to-varholmen": {
    fromId: HARBOR_HONO_ID,
    fromName: "Hönö",
    toName: "Lilla Varholmen",
  },
};

const TRAFIKINFO_ENDPOINT =
  "https://api.trafikinfo.trafikverket.se/v2/data.json";
const CACHE_TTL_SEC = 60; // live feed — short cache to keep disruptions fresh

// FerryAnnouncement.Info on Hönöleden always carries this evergreen reminder.
// Anything that doesn't start with the prefix is treated as a live disruption.
const ROUTINE_INFO_PREFIX = "På färjan: Kör så nära framförvarande bil";

type TfvFerryAnnouncement = {
  Deleted?: boolean;
  Id?: number;
  DepartureTime?: string;
  DeviationId?: string;
  Info?: string[];
  FromHarbor?: { Id?: number; Name?: string };
  ToHarbor?: { Id?: number; Name?: string };
  Route?: { Id?: number; Name?: string };
  ModifiedTime?: string;
};

type TfvResponse = {
  RESPONSE?: {
    RESULT?: Array<{
      FerryAnnouncement?: TfvFerryAnnouncement[];
      ERROR?: { MESSAGE?: string; SOURCE?: string };
    }>;
  };
};

async function fetchAnnouncements(
  apiKey: string,
  harborId: number,
  limit: number,
): Promise<TfvFerryAnnouncement[]> {
  const body = `<REQUEST>
  <LOGIN authenticationkey="${apiKey}" />
  <QUERY objecttype="FerryAnnouncement" schemaversion="1.2" orderby="DepartureTime ASC" limit="${limit}">
    <FILTER>
      <AND>
        <EQ name="Route.Id" value="${FERRY_ROUTE_ID}" />
        <EQ name="FromHarbor.Id" value="${harborId}" />
        <GT name="DepartureTime" value="$now" />
      </AND>
    </FILTER>
  </QUERY>
</REQUEST>`;

  const res = await fetch(TRAFIKINFO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Trafikinfo ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as TfvResponse;
  const result = data.RESPONSE?.RESULT?.[0];
  if (result?.ERROR)
    throw new Error(`Trafikinfo error: ${result.ERROR.MESSAGE}`);
  return result?.FerryAnnouncement ?? [];
}

export type Catchability = "catch" | "maybe" | "miss";

export type NextDeparture = {
  time: string; // "HH:MM" in Europe/Stockholm
  tomorrow?: boolean;
  alerts?: string[]; // non-routine Info strings on this specific departure
  catchability?: Catchability; // filled in by loadStatus when queue delay known.
};

export type FerryFeed = {
  departures: NextDeparture[];
  liveAlerts: string[]; // deduped disruption messages across the upcoming window
};

// FerryAnnouncement.DepartureTime is ISO with offset (e.g. "...+02:00"), so the
// Date parse is unambiguous. We then format back into Stockholm local parts.
function stockholmParts(iso: string): { hhmm: string; ymd: string } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    hhmm: `${get("hour")}:${get("minute")}`,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function stockholmYmd(now: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isRoutineInfo(info: string): boolean {
  return info.startsWith(ROUTINE_INFO_PREFIX);
}

export async function getFerryFeed(
  direction: Direction,
  now: Date,
  count: number,
): Promise<FerryFeed> {
  const { fromId } = HARBOR_BY_DIRECTION[direction];
  const kv = (env as unknown as { QUEUE_CACHE?: KVNamespace }).QUEUE_CACHE;
  const apiKey = (env as unknown as { TRAFIKVERKET_API_KEY?: string })
    .TRAFIKVERKET_API_KEY;
  const cacheKey = `ferryann:${direction}`;

  let announcements: TfvFerryAnnouncement[] | null = null;
  if (kv) {
    announcements = await kv.get<TfvFerryAnnouncement[]>(cacheKey, "json");
  }
  if (!announcements) {
    if (!apiKey) return { departures: [], liveAlerts: [] };
    try {
      // *2 buffer so a few Deleted records don't starve the list.
      announcements = await fetchAnnouncements(apiKey, fromId, count * 2);
      if (kv) {
        await kv.put(cacheKey, JSON.stringify(announcements), {
          expirationTtl: CACHE_TTL_SEC,
        });
      }
    } catch (err) {
      console.error("[trafikverket] FerryAnnouncement fetch failed:", err);
      return { departures: [], liveAlerts: [] };
    }
  }

  const today = stockholmYmd(now);
  const liveAlertsSet = new Set<string>();
  const departures: NextDeparture[] = [];
  for (const a of announcements) {
    if (a.Deleted) continue;
    if (!a.DepartureTime) continue;
    const { hhmm, ymd } = stockholmParts(a.DepartureTime);
    const alerts = (a.Info ?? []).filter(
      (s): s is string => typeof s === "string" && !isRoutineInfo(s),
    );
    for (const msg of alerts) liveAlertsSet.add(msg);
    departures.push({
      time: hhmm,
      tomorrow: ymd === today ? undefined : true,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
    if (departures.length >= count) break;
  }

  return { departures, liveAlerts: Array.from(liveAlertsSet) };
}
