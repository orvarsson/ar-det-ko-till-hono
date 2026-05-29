import { createFileRoute } from "@tanstack/react-router";
import { loadStatus, type LoadedStatus } from "~/server/loadStatus";
import styles from "./index.module.scss";

type SocialMeta = {
  question: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
};

// Direction-specific FAQ. Rendered visibly at the bottom of the page and fed
// into the FAQPage structured data so the schema matches what users actually
// see. Kept truthful: Hönöleden is a free state ferry run by Trafikverkets
// Färjerederi between Lilla Varholmen (Torslanda) and Hönö.
const FAQ: Record<LoadedStatus["direction"], { q: string; a: string }[]> = {
  "to-hono": [
    {
      q: "Är det kö till Hönö just nu?",
      a: "Sidan visar i realtid om det är kö till färjan mot Hönö från Torslanda. Statusen baseras på trafiktid från Google Maps och uppdateras var femte minut.",
    },
    {
      q: "Är Hönöfärjan gratis?",
      a: "Ja. Hönöleden mellan Lilla Varholmen och Hönö drivs av Trafikverkets Färjerederi och är gratis för både bilister och passagerare.",
    },
    {
      q: "Hur ofta går färjan till Hönö?",
      a: "Färjan går ofta – flera turer i timmen – med tätare avgångar under rusningstrafik morgon och eftermiddag.",
    },
  ],
  "to-varholmen": [
    {
      q: "Är det kö till Varholmen just nu?",
      a: "Sidan visar i realtid om det är kö till färjan mot Varholmen från Hönö. Statusen baseras på trafiktid från Google Maps och uppdateras var femte minut.",
    },
    {
      q: "Är färjan från Hönö gratis?",
      a: "Ja. Hönöleden mellan Hönö och Lilla Varholmen drivs av Trafikverkets Färjerederi och är gratis för både bilister och passagerare.",
    },
    {
      q: "Hur ofta går färjan från Hönö?",
      a: "Färjan går ofta – flera turer i timmen – med tätare avgångar under rusningstrafik morgon och eftermiddag.",
    },
  ],
};

const SOCIAL_META: Record<LoadedStatus["direction"], SocialMeta> = {
  "to-hono": {
    question: "Är det kö till Hönö?",
    description:
      "Live-status för Hönöfärjan från Torslanda. Uppdateras var femte minut.",
    canonicalUrl: "https://ardetkotillhono.se/",
    ogImage: "https://ardetkotillhono.se/og-hono.png",
  },
  "to-varholmen": {
    question: "Är det kö till Varholmen?",
    description:
      "Live-status för Varholmenfärjan från Hönö. Uppdateras var femte minut.",
    canonicalUrl: "https://ardetkotillvarholmen.se/",
    ogImage: "https://ardetkotillvarholmen.se/og-varholmen.png",
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
  const social = SOCIAL_META[direction];
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
  const structuredData = buildStructuredData(direction, social);
  const otherDirection: LoadedStatus["direction"] =
    direction === "to-hono" ? "to-varholmen" : "to-hono";
  const other = SOCIAL_META[otherDirection];

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <main className={styles.main}>
        {/* Combining question + answer in one H1 puts the page's keyword
            into the indexed heading instead of leaving it as a sibling
            paragraph. Visual hierarchy is preserved via .heading flex. */}
        <h1 className={styles.heading}>
          <span className={styles.question}>{question}</span>
          <span className={`${styles.answer} ${answerClass}`}>{display}</span>
        </h1>
        {ferryLine && <p className={styles.estimate}>{ferryLine}</p>}
        <p className={styles.meta}>
          {buildFreshnessLine(status?.fetchedAt, status?.stale)}
        </p>
      </main>

      <section className={styles.faq} aria-label="Vanliga frågor">
        <h2 className={styles.faqHeading}>Vanliga frågor</h2>
        <dl className={styles.faqList}>
          {FAQ[direction].map(({ q, a }) => (
            <div key={q} className={styles.faqItem}>
              <dt className={styles.faqQuestion}>{q}</dt>
              <dd className={styles.faqAnswer}>{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className={styles.footer} role="contentinfo">
        <a className={styles.crossLink} href={other.canonicalUrl}>
          {other.question} →
        </a>
        <span className={styles.credit}>
          Skapad av{" "}
          <a href="https://orvify.se" rel="noopener">
            orvify.se
          </a>
        </span>
      </footer>
    </div>
  );
}

function buildStructuredData(
  direction: LoadedStatus["direction"],
  social: SocialMeta,
): string {
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${social.canonicalUrl}#website`,
      url: social.canonicalUrl,
      name: social.question,
      description: social.description,
      inLanguage: "sv-SE",
      publisher: {
        "@type": "Organization",
        name: "Orvify",
        url: "https://orvify.se",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${social.canonicalUrl}#faq`,
      url: social.canonicalUrl,
      mainEntity: FAQ[direction].map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
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
