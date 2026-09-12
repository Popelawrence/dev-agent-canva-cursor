# CONTEXT — Canva Cursor Dev Agent

Use this file as project memory on any AI platform. Paste it first, then use one of the prompts at the bottom.

## What this is

Small Next.js 15 (App Router) + React 19 + TypeScript app.

Repo: `https://github.com/Popelawrence/dev-agent-canva-cursor`  
Live: `https://dev-agent-canva-cursor.vercel.app`  
Host: Vercel (GitHub push-to-deploy; `main` = production). Legacy Netlify may still exist — do not treat it as primary.

Four product surfaces (one page: `app/page.tsx`):

1. **Design brief → concepts** — offline engine, no design API. `lib/suggestions.ts` + `POST /api/suggest`.
2. **Identity-preserving portrait retouch** — classical `sharp` only (YCbCr skin mask + median + feathered blend). Not generative. Must not alter eyes, lips, hair, or likeness. `lib/retouch.ts` + `POST /api/retouch`.
3. **Canva Connect** — OAuth PKCE, upload asset, create design, URL-import a public template file. Optional: if `CANVA_*` unset, hide Canva UI and return 503.
4. **Compose photo onto template** — server-side overlay via `sharp`. Universal substitute for Canva Autofill (Autofill is Enterprise + image-field templates; this account had none). `lib/compose.ts` + `POST /api/compose`.

## Layout

```
app/page.tsx                 # single UI
app/api/health|suggest|retouch|compose
app/api/canva/{connect,callback,status,push,disconnect,import}
lib/suggestions.ts           # offline concepts
lib/retouch.ts               # skin-only retouch
lib/compose.ts               # overlay photo on template
lib/canva.ts                 # Connect API client
lib/canva-formats.ts         # Match photo / IG / presentation / poster / FB
lib/canva-session.ts         # httpOnly cookies + token refresh (demo-grade)
*.test.ts next to libs       # Vitest
```

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 27 tests — keep them green
npm run typecheck && npm run lint && npm run build
```

## Env (never commit values)

```
CANVA_CLIENT_ID
CANVA_CLIENT_SECRET
CANVA_REDIRECT_URI   # must exactly match Canva Developer Portal
```

Production redirect (already registered):

`https://dev-agent-canva-cursor.vercel.app/api/canva/callback`

Local (only if also registered in Canva): `http://127.0.0.1:3000/api/canva/callback`

Scopes: `asset:read asset:write design:content:write design:meta:read`

## API cheat sheet

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ status: "ok" }` |
| POST | `/api/suggest` | `{ prompt, designType, tone, count }` — types: `instagram-post`, `presentation`, `poster`, `logo`, `story` |
| POST | `/api/retouch` | multipart `image`, `strength` 0–1 → base64 original/retouched |
| POST | `/api/compose` | multipart `template`, `photo`, `position`, `scalePercent` |
| GET | `/api/canva/status` | `{ configured, connected }` |
| GET | `/api/canva/connect` | 307 to Canva authorize |
| GET | `/api/canva/callback` | OAuth return |
| POST | `/api/canva/push` | `mode=design` (create) or `mode=asset` (Uploads only) |
| POST | `/api/canva/import` | `{ url, title }` public file URL; polls up to ~60s |
| POST | `/api/canva/disconnect` | clear cookies |

Canva formats (`lib/canva-formats.ts`): `match`, `instagram_post`, `instagram_story`, `presentation`, `poster`, `facebook_post`.

## Hard constraints (do not violate)

- Retouch stays classical `sharp`. No generative face rewrite.
- Do not invent Canva APIs. Autofill cannot place a photo into an arbitrary imported design. Compose is the account-agnostic auto-place path.
- `upload-asset-from-url` / URL import need a **public HTTPS** URL that returns 200 on HEAD/GET. Localhost and signed-in Etsy pages fail.
- Etsy “Use this template” Canva links are opened in Canva, not imported via URL.
- Canva OAuth from automated browsers hits Cloudflare CAPTCHA — a human must click Connect Canva.
- Tokens are demo-grade httpOnly cookies, not a production auth system.
- API routes use `runtime = "nodejs"` because of `sharp`. Import `maxDuration` is 60s (Hobby may time out; retouch/compose are fast).
- Canva UI must stay hidden when env vars are missing. Tests must pass without Canva credentials.
- Do not add Netlify-specific config. Vercel is the host. No `vercel.json` required.
- Keep changes small. Match existing TypeScript style. Add/extend Vitest next to the lib you touch.

## Known product gaps (valid future work, not bugs)

- Compose flattens to JPEG; it is not a live editable Canva layer stack.
- Preview deploys are SSO-protected; OAuth redirect is production-only unless extra callbacks are registered.
- Site is public: anyone with the URL can retouch/compose; Canva actions are per-browser OAuth.

---

## Prompts to paste after this file

### 1. Bootstrap (always first)

```
You are the engineer for this repo. CONTEXT.md is source of truth.
Do not invent Canva APIs. Do not replace retouch with a generative model.
Read the relevant files before editing. Keep tests green (`npm test`).
Confirm you understand the four surfaces and the hard constraints, then wait for a task.
```

### 2. Implement a feature

```
Implement: <one sentence>.
Touch only the files that need to change. Follow existing patterns in app/ and lib/.
If Canva is involved, use lib/canva.ts + documented Connect endpoints only.
Add or update Vitest coverage for new logic. Run npm test && npm run typecheck.
Summarize what you changed and how to verify it locally.
```

### 3. Debug Canva connect / push / import

```
Canva flow is broken: <symptom, status code, or screenshot>.
Trace /api/canva/* → lib/canva.ts → lib/canva-session.ts.
Check CANVA_REDIRECT_URI exact match, configured vs connected, and cookie/PKCE state.
Do not ask me to paste secrets. If env is missing, say which names are needed, not values.
Propose the smallest fix.
```

### 4. Change the UI

```
Update the single-page UI in app/page.tsx: <what should change>.
Keep Canva actions gated on /api/canva/status.
Do not add a new framework or component library.
Describe the user-visible before/after.
```

### 5. Safe explore-only

```
Do not edit files. Explain how <feature> works, which files own it, and the
failure modes (empty env, private template URL, Hobby timeout, Cloudflare OAuth).
Cite file paths.
```
