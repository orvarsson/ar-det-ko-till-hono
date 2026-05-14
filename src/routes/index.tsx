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
  const { question, status } = data;

  const answer = status?.status;
  const answerClass = answer === "Ja" ? styles.ja : answer === "Nej" ? styles.nej : styles.unknown;
  const display = answer ?? "Vet ej just nu";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.question}>{question}</p>
        <h1 className={`${styles.answer} ${answerClass}`}>{display}</h1>
        <p className={styles.meta}>{buildFreshnessLine(status?.fetchedAt, status?.stale)}</p>
      </main>

      <footer className={styles.footer}>
        Skapad av{" "}
        <a href="https://orvify.se" rel="noopener">
          orvify.se
        </a>
      </footer>
    </div>
  );
}

function buildFreshnessLine(fetchedAt: string | undefined, stale: boolean | undefined): string {
  if (!fetchedAt) return "Ingen färsk data tillgänglig.";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000));
  const base = minutes === 0
    ? "Uppdaterad just nu"
    : minutes === 1
      ? "Uppdaterad för 1 minut sedan"
      : `Uppdaterad för ${minutes} minuter sedan`;
  return stale ? `${base} (gammal data — Google svarade inte)` : base;
}
