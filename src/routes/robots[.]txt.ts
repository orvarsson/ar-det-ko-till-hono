import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { canonicalForRequest } from "~/server/canonical";

function buildRobots(canonical: string): string {
  return `# Content Signals: declare AI usage preferences
# See: https://contentsignals.org/
#
# Allow AI search/retrieval bots so we stay visible in AI answers,
# block AI training crawlers so we don't contribute to model training.
Content-Signal: ai-train=no, search=yes, ai-input=yes

# ── Block AI training crawlers ──────────────────────────────────
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: PanguBot
Disallow: /

User-agent: Diffbot
Disallow: /

# ── Allow AI search / retrieval bots ────────────────────────────
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: DuckAssistBot
Allow: /

# ── Default: traditional search engines and everyone else ───────
User-agent: *
Allow: /

Sitemap: ${canonical}/sitemap.xml
`;
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const canonical = canonicalForRequest(getRequest());
        return new Response(buildRobots(canonical), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control":
              "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
