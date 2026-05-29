import { createFileRoute } from "@tanstack/react-router";
import { loadStatus, type LoadedStatus } from "~/server/loadStatus";
import styles from "./index.module.scss";

type SocialMeta = {
  question: string;
  // Short keyword qualifier appended to the <title> tag. The visible H1 stays
  // the bare question; the title can carry the brand/route keyword too.
  titleQualifier: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
};

const SOCIAL_META: Record<LoadedStatus["direction"], SocialMeta> = {
  "to-hono": {
    question: "Är det kö till Hönö?",
    titleQualifier: "Hönöfärjan live",
    description:
      "Är det kö till färjan till Hönö just nu? Live-status för Hönöfärjan (Hönöleden) mellan Lilla Varholmen och Hönö Pinan – uppdateras var femte minut.",
    keywords:
      "är det kö till Hönö, kö Hönö, färja till Hönö, Hönöfärjan, Hönöleden, Hönö Pinan färja, Lilla Varholmen, färja Torslanda Hönö, kö Hönöfärjan",
    canonicalUrl: "https://ardetkotillhono.se/",
    ogImage: "https://ardetkotillhono.se/og-hono.png",
  },
  "to-varholmen": {
    question: "Är det kö till Varholmen?",
    titleQualifier: "Hönöfärjan live",
    description:
      "Är det kö till färjan från Hönö Pinan mot Lilla Varholmen just nu? Live-status för Hönöfärjan (Hönöleden) – uppdateras var femte minut.",
    keywords:
      "är det kö till Varholmen, kö Varholmen, färja från Hönö, Hönö Pinan färja, Lilla Varholmen, Hönöfärjan, Hönöleden, kö Hönö Pinan",
    canonicalUrl: "https://ardetkotillvarholmen.se/",
    ogImage: "https://ardetkotillvarholmen.se/og-varholmen.png",
  },
};

// Direction-specific Q&A used for FAQPage structured data. Kept truthful so the
// schema stays accurate: Hönöleden is a free state ferry run by Trafikverkets
// Färjerederi between Lilla Varholmen and Hönö Pinan.
const FAQ: Record<LoadedStatus["direction"], { q: string; a: string }[]> = {
  "to-hono": [
    {
      q: "Är det kö till Hönö just nu?",
      a: "Den här sidan visar i realtid om det är kö till Hönöfärjan vid Lilla Varholmen. Svaret baseras på aktuell trafiktid från Google Maps och uppdateras var femte minut.",
    },
    {
      q: "Är Hönöfärjan gratis?",
      a: "Ja. Hönöfärjan (Hönöleden) mellan Lilla Varholmen och Hönö Pinan drivs av Trafikverkets Färjerederi och är gratis för både bilister och passagerare.",
    },
    {
      q: "Hur ofta går färjan till Hönö?",
      a: "Färjan till Hönö går ofta – flera turer i timmen – med tätare avgångar under rusningstrafik morgon och eftermiddag.",
    },
  ],
  "to-varholmen": [
    {
      q: "Är det kö till Varholmen just nu?",
      a: "Den här sidan visar i realtid om det är kö till färjan från Hönö Pinan mot Lilla Varholmen. Svaret baseras på aktuell trafiktid från Google Maps och uppdateras var femte minut.",
    },
    {
      q: "Var ligger Hönö Pinan?",
      a: "Hönö Pinan är färjeläget på Hönö där Hönöfärjan lägger till. Härifrån går färjan tillbaka mot Lilla Varholmen och fastlandet.",
    },
    {
      q: "Är färjan från Hönö gratis?",
      a: "Ja. Hönöfärjan (Hönöleden) mellan Hönö Pinan och Lilla Varholmen drivs av Trafikverkets Färjerederi och är gratis.",
    },
  ],
};

export const Route = createFileRoute("/")({
  loader: () => loadStatus(),
  head: ({ loaderData }) => {
    const direction = loaderData?.direction ?? "to-hono";
    const social = SOCIAL_META[direction];
    const answer = loaderData?.status?.status;
    // Browser tab title gets the live answer; social titles stay evergreen
    // because Facebook/Twitter cache previews server-side and a stale "Ja"
    // would be worse than no answer at all. The qualifier adds the route
    // keyword ("Hönöfärjan") to the <title> without touching the visible H1.
    const tabTitle = answer
      ? `${answer} — ${social.question} | Hönöfärjan`
      : `${social.question} | ${social.titleQualifier}`;
    return {
      meta: [
        { title: tabTitle },
        { name: "description", content: social.description },
        { name: "keywords", content: social.keywords },
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
  const {
    question,
    status,
    direction,
    nextDepartures,
    liveAlerts,
    fromHarbor,
    ferriesAhead,
  } = data;
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
    answer === "Ja" && ferriesAhead != null
      ? ferryEstimateLine(ferriesAhead)
      : null;
  const showCatchability = nextDepartures.some((d) => d.catchability);
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
        {liveAlerts.length > 0 && (
          <aside className={styles.alerts} role="status">
            <span className={styles.alertsLabel}>Driftinformation</span>
            <ul className={styles.alertsList}>
              {liveAlerts.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </aside>
        )}
        {nextDepartures.length > 0 && (
          <section className={styles.departures} aria-label="Nästa avgångar">
            <h2 className={styles.departuresHeading}>
              Nästa avgångar från {fromHarbor}
            </h2>
            <ul className={styles.departuresList}>
              {nextDepartures.map((dep) => {
                const catchClass = dep.catchability
                  ? styles[`catch_${dep.catchability}`]
                  : "";
                const catchLabel = dep.catchability
                  ? CATCHABILITY_LABEL[dep.catchability]
                  : null;
                const ariaLabel = [
                  dep.time,
                  dep.tomorrow ? "imorgon" : null,
                  catchLabel,
                  dep.alerts?.length ? `driftinformation: ${dep.alerts.join(" ")}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <li
                    key={`${dep.tomorrow ? "t" : "d"}-${dep.time}`}
                    className={`${styles.departuresItem} ${catchClass} ${dep.alerts ? styles.departuresItemAlert : ""}`}
                    title={dep.alerts?.join(" · ")}
                    aria-label={ariaLabel}
                  >
                    <span className={styles.departuresTime}>{dep.time}</span>
                    {dep.tomorrow && (
                      <span className={styles.departuresTag}>imorgon</span>
                    )}
                    {dep.alerts && (
                      <span className={styles.departuresTag} aria-hidden="true">
                        !
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {showCatchability && (
              <ul className={styles.legend} aria-label="Förklaring">
                <li className={styles.legendItem}>
                  <span
                    className={`${styles.legendDot} ${styles.catch_catch}`}
                    aria-hidden="true"
                  />
                  Hinner
                </li>
                <li className={styles.legendItem}>
                  <span
                    className={`${styles.legendDot} ${styles.catch_maybe}`}
                    aria-hidden="true"
                  />
                  Kanske
                </li>
                <li className={styles.legendItem}>
                  <span
                    className={`${styles.legendDot} ${styles.catch_miss}`}
                    aria-hidden="true"
                  />
                  Missar
                </li>
              </ul>
            )}
          </section>
        )}
        <a
          className={styles.timetableLink}
          href="https://honoleden.se"
          rel="noopener"
        >
          Se hela tidtabellen på Hönöleden.se →
        </a>
      </main>

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
      keywords: social.keywords,
      about: [
        { "@type": "Place", name: "Hönö" },
        { "@type": "Place", name: "Hönö Pinan" },
        { "@type": "Place", name: "Lilla Varholmen" },
        { "@type": "Place", name: "Hönöleden" },
      ],
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

function ferryEstimateLine(ferriesAhead: number): string {
  if (ferriesAhead === 0) return "..men, du borde komma med färjan ändå!";
  if (ferriesAhead === 1) return "Du kommer antagligen att behöva vänta 1 färja";
  if (ferriesAhead <= 4)
    return `Du kommer antagligen att behöva vänta ${ferriesAhead} färjor`;
  return "Du kommer antagligen att behöva vänta ett bra tag";
}

const CATCHABILITY_LABEL: Record<
  NonNullable<LoadedStatus["nextDepartures"][number]["catchability"]>,
  string
> = {
  catch: "Hinner",
  maybe: "Hinner kanske",
  miss: "Missar",
};

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
