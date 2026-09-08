# dev-agent-canva-cursor

**Canva Cursor Dev Agent** — a small full-stack web app that turns a plain-language
design brief into structured Canva design concepts: dimensions, color palettes,
font pairings, layouts, and headlines. The suggestion engine runs fully offline
(no external design API required), which keeps local development and testing
self-contained.

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

## Cloud Agent environment

The Cloud Agent development environment is defined in
[`.cursor/environment.json`](.cursor/environment.json): it runs `npm install` on
setup and launches the dev server as a persistent terminal.
