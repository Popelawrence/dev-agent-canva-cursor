# dev-agent-canva-cursor

**Canva Cursor Dev Agent** — a small full-stack web app that turns a plain-language
design brief into structured Canva design concepts: dimensions, color palettes,
font pairings, layouts, and headlines. The suggestion engine runs fully offline
(no external design API required), which keeps local development and testing
self-contained.

It also includes an **identity-preserving portrait retouch** tool: upload a
photo and it softens skin texture and wrinkles while leaving the person's
likeness intact. Only skin regions (detected via YCbCr chrominance) are
smoothed with an edge-preserving median filter blended at an adjustable
strength, so eyes, lips, hair, and facial structure are never altered. This is
classical retouching (via [`sharp`](https://sharp.pixelplumbing.com/)), not
generative re-synthesis, so it cannot drift the subject's identity.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- API routes for the backend (`/api/health`, `/api/suggest`)
- [Vitest](https://vitest.dev/) for unit tests
- ESLint (`eslint-config-next`) for linting

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server on http://localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000), fill in a design brief,
choose a design type and tone, and click **Generate design concepts**.

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the Next.js dev server (port 3000)     |
| `npm run build`     | Production build                             |
| `npm start`         | Serve the production build                    |
| `npm run lint`      | Run ESLint                                    |
| `npm run typecheck` | Type-check with `tsc --noEmit`               |
| `npm test`          | Run the Vitest unit suite                     |

## API

### `GET /api/health`

Returns service health, e.g. `{ "status": "ok", "service": "dev-agent-canva-cursor" }`.

### `POST /api/suggest`

Request body:

```json
{
  "prompt": "Summer coffee launch for a local cafe",
  "designType": "instagram-post",
  "tone": "playful",
  "count": 3
}
```

`designType` must be one of: `instagram-post`, `presentation`, `poster`, `logo`, `story`.
Returns an array of design suggestions.

### `POST /api/retouch`

Accepts `multipart/form-data` with:

- `image` — the photo file to retouch
- `strength` — smoothing strength from `0` (no change) to `1` (maximum)

Returns JSON with base64 `original` and `retouched` data URLs plus `width`,
`height`, `skinRatio` (fraction of pixels treated as skin), and the applied
`strength`.

## Canva integration (Canva Connect API)

When configured, the app can send a retouched photo straight into a real,
editable Canva design using the [Canva Connect API](https://www.canva.dev/docs/connect/).
The flow:

1. **Connect Canva** — OAuth 2.0 Authorization Code + PKCE (`/api/canva/connect` → Canva → `/api/canva/callback`).
2. **Pick a design format** — choose the target size (Match photo, Instagram post/story, Presentation, Poster, Facebook post; see `lib/canva-formats.ts`).
3. **Send to Canva** — `/api/canva/push` uploads the retouched image as an asset (`POST /v1/asset-uploads`, polled to completion) and creates a design at the chosen size (`POST /v1/designs`), returning an edit URL.

The retouched photo can also be downloaded directly from the app without Canva.

### Import an existing template (Etsy or similar)

Bring in a template you own — e.g. an Etsy digital download — and edit it in
Canva, then add your own photo:

- **Import a template** — `/api/canva/import` imports a public template **file**
  URL (PDF, PPTX, DOCX, PNG, JPG) into your Canva as an editable design via the
  Canva Connect [URL import API](https://www.canva.dev/docs/connect/api-reference/design-imports/create-url-import-job/) (`POST /v1/url-imports`, polled).
- **Add your photo** — when sending a retouched photo, choose **Add to my Canva
  Uploads** (`mode=asset` on `/api/canva/push`) so it lands in your Canva
  Uploads, ready to drag into the imported template. (Or **Create new design**
  to make a standalone design from the photo.)

Notes: the file URL must be publicly accessible; Etsy "Use this template" Canva
links should be opened directly in Canva (they copy into your account). Only
import templates you have the right to use.

Client code lives in `lib/canva.ts`; token storage (demo-grade, httpOnly cookies) in `lib/canva-session.ts`.

### Setup

1. Create an integration in the [Canva Developer Portal](https://www.canva.com/developers/): set a name, generate a client secret, and select scopes `asset:read asset:write design:content:write design:meta:read`.
2. Add a redirect URL of the form `https://<your-deployment>/api/canva/callback` (must exactly match `CANVA_REDIRECT_URI`).
3. Set `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, and `CANVA_REDIRECT_URI` (see `.env.example`).

If these are unset, the app runs normally and the Canva actions are hidden.

> Note: The agent-side Canva MCP tools (`upload-asset-from-url`, `generate-design`) can also place a photo into a design, but `upload-asset-from-url` requires a public HTTPS URL. The Connect API integration above is the runtime path for the app itself.

## Deployment

The app deploys on [Vercel](https://vercel.com/). Next.js is auto-detected
(install `npm install`, build `next build`); no `vercel.json` is required.

### Import the GitHub repo (one-time)

1. Open [vercel.com/new](https://vercel.com/new) and **Import Git Repository**.
2. Authorize the Vercel GitHub App with access to
   `Popelawrence/dev-agent-canva-cursor`.
3. Leave the Next.js defaults. Production branch is `main`.
4. Add Environment Variables for **Production** and **Preview**:
   - `CANVA_CLIENT_ID`
   - `CANVA_CLIENT_SECRET`
   - `CANVA_REDIRECT_URI` — set after the first deploy (see below)
5. Click **Deploy**.

Every push to `main` deploys production. Pull requests get preview URLs.

### Canva redirect after the first deploy

1. Note the production domain (e.g. `https://<project>.vercel.app`).
2. Set `CANVA_REDIRECT_URI` to
   `https://<project>.vercel.app/api/canva/callback` and **Redeploy** so the
   new value is picked up.
3. In the [Canva Developer Portal](https://www.canva.com/developers/), add that
   exact callback URL to the integration's Redirect URLs.

Hobby plan note: `/api/canva/import` sets `maxDuration` to 60s. A slow import
can time out on Hobby; Pro allows the full duration. Retouch and compose are
fast and are unaffected.

## Cloud Agent environment

The Cloud Agent development environment is defined in
[`.cursor/environment.json`](.cursor/environment.json): it runs `npm install` on
setup and launches the dev server as a persistent terminal.
