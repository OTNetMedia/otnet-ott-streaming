# OTNet Prime

A Netflix-style streaming website built with Next.js 14, fully powered by the
[OTNet](https://otnet.io) catalog, playback, EPG and viewer-auth APIs. Drop in
your own publisher API key and the entire site — homepage, browse, content
detail, live TV guide, my list, profiles, login — runs against your catalogue.

Live preview style is closer to Netflix / Prime Video: full-bleed hero with
teaser playback, focus-tile rows, editorial rows, Prime-style EPG grid, and a
cinematic content detail page.

![Homepage with full-bleed hero and content rows](docs/homepage.png)

## Features

- **Homepage** — rotating hero (with auto-play teaser + unmute), focus rows,
  editorial rows, standard portrait/landscape rows
- **Content detail** — cinematic hero, cast & crew, episode list for series,
  paywall CTAs, X-Ray sidebar
- **Live TV (EPG)** — Prime-style grid with sticky channels rail, current-time
  pill, program tiles drawn from `/catalog/epg?channelId=…`
- **Channel detail** — live player + day-grouped schedule with thumbnails
- **My List** — add/remove from any content card or hero, syncs per profile
- **Profiles** — full Netflix-style picker, create / edit / delete, kids flag
- **Search & browse** — category navigation and full-text search
- **Auth** — OTNet hosted viewer auth (email + password) or external SSO
- **DRM playback** — DASH via [shaka-player](https://github.com/shaka-project/shaka-player)
  through OTNet's signed playback sessions

## Tech stack

- Next.js 14 (App Router, RSC)
- TypeScript
- Tailwind CSS
- shaka-player for DASH/Widevine
- OTNet `<otnet-video-player>` web component for VOD + live

## Quick start

```bash
git clone <your-fork-url>
cd website-ai-otnet
npm install
cp .env.local.example .env.local
# edit .env.local and paste your OTNet publisher key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Everything that changes the site's behaviour lives in **two places**:

### 1. Environment variables

| Variable | Required | Description |
|---|---|---|
| `OTNET_API_KEY` | ✅ | Your publisher API key from [otnet.io](https://otnet.io). Used as `X-Api-Key` on every server-side OTNet call. |
| `SITE_URL` | optional | Public origin of the site (defaults to `http://localhost:3000`). Used for auth callbacks. |

### 2. Publisher settings (managed in the OTNet dashboard)

The site reads `/catalog/settings` on every render and adapts to it. From the
OTNet dashboard you can change, with no code:

- **Brand** — name + logo shown in the header
- **Viewer auth mode** — `none`, OTNet hosted, or external SSO URL
- **My List** — enable / disable, show on homepage, show in nav
- **EPG** — enable / disable, past + future hours window
- **Age ratings** — enable / disable, rating system, allowed ratings
- **Subscription plans** — Stripe price IDs, SVOD gating
- **Profiles** — limit per account

There is no code change required to swap publishers — point the env var at a
different `OTNET_API_KEY` and the entire experience (brand, catalogue, plans,
channels) follows.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo into [Vercel](https://vercel.com) — Next.js is autodetected.
3. Under **Settings → Environment Variables**, add:
   - `OTNET_API_KEY` = your publisher key
   - `SITE_URL` = your production domain (e.g. `https://watch.example.com`)
4. Deploy. Vercel will run `next build` and host the site on a global edge
   network.

For custom domains and SSL, follow Vercel's
[domain setup guide](https://vercel.com/docs/projects/domains).

## Project layout

```
app/
  api/             Next.js route handlers — proxy to OTNet with viewer auth
    auth/          Sign in / register / refresh / logout
    otnet/         Playback session, channel mints, settings, telemetry
    viewer/        My List + Profiles
  browse/          Category landing + content grid
  content/[id]/    Content detail page
  epg/             Live TV guide + channel detail
  my-list/         The viewer's saved titles
  profiles/        Netflix-style profile picker / manager
  watch/[id]/      Full-screen player
  page.tsx         Homepage (hero + rows)
components/        Hero, rows, tiles, player, EPG grid, profile UI…
lib/
  api.ts           Typed OTNet API client (X-Api-Key + optional viewer Bearer)
  config.ts        Reads /catalog/settings into a strongly-typed config
  profile.ts       Active-profile cookie helpers
  types.ts         All OTNet response shapes + safe accessors
```

## OTNet APIs used

All calls go through `lib/api.ts`, which sends the publisher key plus (when
present) the viewer JWT cookie. Key endpoints:

| Surface | OTNet endpoint |
|---|---|
| Homepage | `GET /catalog/homepage` |
| Content detail | `GET /catalog/content/:id` |
| Series children | `GET /catalog/content/:id/children` |
| Category browse | `GET /catalog/content/category/:id` |
| Search | `GET /catalog/content?search=` |
| Categories tree | `GET /catalog/categories/tree` |
| Channels | `GET /catalog/channels` |
| EPG | `GET /catalog/epg?channelId=…&back=…&ahead=…` |
| Settings | `GET /catalog/settings` |
| Playback session | `POST /playback/session` |
| Live channel mint | `POST /playback/live/:id/mint` |
| Viewer auth | `POST /viewer/auth/{login,register,refresh}` |
| My List | `GET/POST/DELETE /viewer/list` |
| Profiles | `GET/POST/PATCH/DELETE /viewer/profiles` |

See the [OTNet API docs](https://otnet.io/docs/api) for the full surface.

## Security notes

- `OTNET_API_KEY` is **server-side only** — it is never exposed to the browser.
- Viewer JWTs are stored in `httpOnly` cookies (`otnet_viewer`,
  `otnet_viewer_refresh`).
- All viewer-scoped API calls are proxied through `/api/...` routes so the
  publisher key never leaves the server.
- Per-viewer data is fetched with `cache: 'no-store'` so one viewer's list
  never leaks into another's HTML cache.

## Links

- [OTNet](https://otnet.io)
- [OTNet docs](https://otnet.io/docs)
- [API reference](https://otnet.io/docs/api)
- [Next.js](https://nextjs.org)
- [Vercel](https://vercel.com)

## License

Choose a license that fits your project. This template ships without one.
