import { createFileRoute } from "@tanstack/react-router";
import { loadStatus, type LoadedStatus } from "~/server/loadStatus";
import styles from "./index.module.scss";

type SocialMeta = {
  question: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
};

const SOCIAL_META: Record<LoadedStatus["direction"], SocialMeta> = {
  "to-hono": {
    question: "Är det kö till Hönö?",
    description:
      "Live-status för Hönöfärjan från Torslanda. Uppdateras var femte minut.",
    canonicalUrl: "https://ärdetkötillhönö.se/",
    ogImage: "https://ärdetkötillhönö.se/og-hono.png",
  },
  "to-varholmen": {
    question: "Är det kö till Varholmen?",
    description:
      "Live-status för Varholmenfärjan från Hönö. Uppdateras var femte minut.",
    canonicalUrl: "https://ärdetkötillvarholmen.se/",
    ogImage: "https://ärdetkötillvarholmen.se/og-varholmen.png",
  },
};

export const Route = createFileRoute("/")({
  loader: () => loadStatus(),
  head: ({ loaderData }) => {
    const direction = loaderData?.direction ?? "to-hono";
    const social = SOCIAL_META[direction];
    const answer = loaderData?.status?.status;
    // Browser tab title gets the live answer; social titles stay evergreen
    // because Facebook/Twitter cache previews server-side and a stale "Ja"
    // would be worse than no answer at all.
    const tabTitle = answer ? `${answer} — ${social.question}` : social.question;
    return {
      meta: [
        { title: tabTitle },
        { name: "description", content: social.description },
        { property: "og:title", content: social.question },
        { property: "og:description", content: social.description },
        { property: "og:url", content: social.canonicalUrl },
        { property: "og:image", content: social.ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: social.question },
        { name: "twitter:title", content: social.question },
        { name: "twitter:description", content: social.description },
        { name: "twitter:image", content: social.ogImage },
      ],
      links: [{ rel: "canonical", href: social.canonicalUrl }],
    };
  },
  component: QueuePage,
});

function QueuePage() {
  const data = Route.useLoaderData() as LoadedStatus;
  const { question, status, direction } = data;
  const answer = status?.status;
  const answerClass =
    answer === "Ja"
      ? styles.ja
      : answer === "Nej"
        ? styles.nej
        : styles.unknown;
  const display = answer ?? "Vet ej just nu";
  const ferryLine =
    answer === "Ja" && status
      ? ferryEstimateLine(status.durationSec - status.staticDurationSec)
      : null;
  const ariaLabel = buildAriaLabel(answer, direction);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.question}>{question}</p>
        <h1
          className={`${styles.answer} ${answerClass}`}
          aria-label={ariaLabel}
        >
          {display}
        </h1>
        {ferryLine && <p className={styles.estimate}>{ferryLine}</p>}
        <p className={styles.meta}>
          {buildFreshnessLine(status?.fetchedAt, status?.stale)}
        </p>
      </main>

      <footer className={styles.footer} role="contentinfo">
        Skapad av{" "}
        <a href="https://orvify.se" rel="noopener">
          orvify.se
        </a>
      </footer>
    </div>
  );
}

function buildAriaLabel(
  answer: "Ja" | "Nej" | undefined,
  direction: LoadedStatus["direction"],
): string {
  const place = direction === "to-hono" ? "Hönö" : "Varholmen";
  if (answer === "Ja") return `Ja, det är kö till ${place}`;
  if (answer === "Nej") return `Nej, det är ingen kö till ${place}`;
  return `Vet ej om det är kö till ${place} just nu`;
}

function ferryEstimateLine(delaySec: number): string {
  const min = Math.max(0, Math.round(delaySec / 60));
  if (min <= 2) return "..men, du borde komma med färjan ändå!";
  if (min <= 4) return "Du kommer antagligen att behöva vänta 1 färja";
  if (min <= 7) return "Du kommer antagligen att behöva vänta 2 färjor";
  if (min <= 10) return "Du kommer antagligen att behöva vänta 3 färjor";
  if (min <= 15) return "Du kommer antagligen att behöva vänta 4 färjor";
  return "Du kommer antagligen att behöva vänta ett bra tag";
}

function buildFreshnessLine(
  fetchedAt: string | undefined,
  stale: boolean | undefined,
): string {
  if (!fetchedAt) return "Ingen färsk data tillgänglig.";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000),
  );
  const base =
    minutes === 0
      ? "Uppdaterad just nu"
      : minutes === 1
        ? "Uppdaterad för 1 minut sedan"
        : `Uppdaterad för ${minutes} minuter sedan`;
  return stale ? `${base} (gammal data — svarade inte)` : base;
}
