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

## Canva integration

The app's design concepts and retouched photos are designed to feed into Canva.
Placing a photo into a real Canva design is done through the Canva MCP tools
(`upload-asset-from-url` → `generate-design` / `perform-editing-operations`).
Note that `upload-asset-from-url` requires a **public HTTPS URL**, so a deployed
instance (or a provided public URL) is needed to push app-produced images into
Canva; the retouch itself runs locally with no external dependencies.

## Cloud Agent environment

The Cloud Agent development environment is defined in
[`.cursor/environment.json`](.cursor/environment.json): it runs `npm install` on
setup and launches the dev server as a persistent terminal.
