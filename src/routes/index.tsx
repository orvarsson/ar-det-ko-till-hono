import { createFileRoute } from "@tanstack/react-router";
import { loadStatus, type LoadedStatus } from "~/server/loadStatus";
import styles from "./index.module.scss";

export const Route = createFileRoute("/")({
  loader: () => loadStatus(),
  head: ({ loaderData }) => {
    const question = loaderData?.question ?? "Är det kö till Hönö?";
    const answer = loaderData?.status?.status;
    const title = answer ? `${answer} — ${question}` : question;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Live-status för färjekön mellan Hönö och Lilla Varholmen, uppdaterad var femte minut.`,
        },
        { property: "og:title", content: title },
      ],
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
