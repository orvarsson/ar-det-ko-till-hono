# Är det kö till Hönö / Varholmen

Two-domain SSR app that answers a single question: is there currently a queue
for the Hönö–Varholmen ferry? Built with **TanStack Start** on **Cloudflare
Workers** with **Workers KV** caching.

- `ärdetkötillhönö.se` → Torslanda → Hönö direction
- `ärdetkötillvarholmen.se` → Hönö → Varholmen direction

Both domains hit the same Worker; direction is picked from the Host header.

## How it works

Each request:

1. The Worker reads the `Host` header to pick a direction.
2. It looks up `queue:<direction>` in KV (5 min TTL).
3. On miss, it calls Google's Routes API (`computeRoutes`,
   `TRAFFIC_AWARE`) and compares `duration` to `staticDuration`. If live
   duration is longer, there's a queue → "Ja".
4. The result is written back to KV (both the 5-min cache key and a 6-hour
   `last-good` fallback used when Google fails).

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # then fill in your Google Maps API key
npm run dev
```

The Vite dev server runs at `http://localhost:3000`. To test a specific
direction, send the Host header:

```sh
curl -H "Host: xn--rdetktillhn-k8a3vfb.se" http://localhost:3000/
curl -H "Host: xn--rdetktillvarholmen-ktb97a.se" http://localhost:3000/
```

Unknown hosts fall back to `to-hono` so plain `localhost` still works.

## Deployment

```sh
# One-time setup
wrangler kv namespace create QUEUE_CACHE                  # paste id into wrangler.jsonc
wrangler kv namespace create QUEUE_CACHE --preview        # paste preview_id
wrangler secret put GOOGLE_MAPS_API_KEY                   # paste key

# Manual deploy
npm run deploy
```

### Auto-deploy via GitHub Actions

`.github/workflows/deploy.yml` runs build + typecheck + `wrangler deploy`
on every push to `main`. Add these repository secrets in
GitHub (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` — create at
  [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
  using the "Edit Cloudflare Workers" template.
- `CLOUDFLARE_ACCOUNT_ID` — visible on any zone overview in the dashboard.

`GOOGLE_MAPS_API_KEY` is **not** in GitHub — it lives as a Worker secret
set with `wrangler secret put`.

In the Cloudflare dashboard, attach both custom domains
(`ärdetkötillhönö.se` and `ärdetkötillvarholmen.se`) to the Worker — both
the Unicode and the Punycode forms should appear; verify both.

### Google Cloud Console hardening

- Restrict the API key to the Routes API only.
- Set a daily quota (~500 calls is plenty given 5-min server-side caching).
- Add a $1/$5/$20 budget alert.

## Project layout

```
src/
  routes/
    __root.tsx        # html shell, fonts, <html lang="sv">
    index.tsx         # the page — renders Ja / Nej / Vet ej just nu
    index.module.scss
  server/
    directions.ts     # coordinates per direction, host → direction mapping
    google.ts         # Routes API client
    queue.ts          # KV cache + Google fetch (uses cloudflare:workers env)
    loadStatus.ts     # the server function the page loader calls
  styles/
    global.scss       # tokens, reset, base typography
wrangler.jsonc        # Cloudflare config
vite.config.ts        # Vite + @cloudflare/vite-plugin + TanStack Start
```

## Notes

- Coordinates in `src/server/directions.ts` are first-pass guesses — verify
  on Google Maps that they're close enough to the ferry slip that the
  traffic signal isn't noisy.
- KV TTL: 300 s primary, 21 600 s last-good fallback.
- No client-side JS is required to read the answer; the page is fully SSR.
