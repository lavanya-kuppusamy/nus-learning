# Snip — URL Shortener

One backend, two clients. Each layer lives on its own branch and is mounted here as
a Git submodule so you can work on any piece in isolation while still running
everything together from a single checkout.

```
                    ┌─────────────────────┐
                    │      backend        │
                    │  Bun + plain HTTP   │
                    │  in-memory store    │
                    │      :3000          │
                    └──────────┬──────────┘
                               │  REST / JSON
              ┌────────────────┴────────────────┐
              │                                 │
   ┌──────────▼──────────┐           ┌──────────▼──────────┐
   │      frontend       │           │        cli          │
   │  Angular SPA        │           │  Node.js CLI        │
   │  browser  :4200     │           │  terminal           │
   └─────────────────────┘           └─────────────────────┘
```

Both clients configure the backend base URL through the `SNIP_API` environment
variable (default `http://localhost:3000`).

---

## API contract

| Method | Path | Request body | Success response | Description |
|--------|------|-------------|-----------------|-------------|
| `POST` | `/api/links` | `{ "url": "<http(s)-url>" }` | `201 { code, url, shortUrl, hits, createdAt }` | Shorten a URL |
| `GET` | `/api/links` | — | `200 [{ code, url, shortUrl, hits, createdAt }]` | List all links |
| `GET` | `/:code` | — | `302 Location: <original-url>` | Follow a short link (increments `hits`) |
| `OPTIONS` | `*` | — | `204` | CORS preflight |

Error responses are `{ "error": "<message>" }` with an appropriate 4xx status.  
CORS headers (`Access-Control-Allow-Origin: *`) are set on every response.

---

## Repository layout

```
main (this branch — superproject)
├── .gitmodules          ← submodule registry
├── backend/             → tracks origin/backend
├── frontend/            → tracks origin/frontend
└── cli/                 → tracks origin/cli
```

Each directory is a **Git submodule**: a pointer to a specific commit on the named
branch of this same repository. The superproject stores only the branch name and the
pinned commit SHA — not the file contents.

| Branch | Stack | Entry point |
|--------|-------|-------------|
| `backend` | Bun, zero npm deps | `server.js` |
| `frontend` | Angular 17, TypeScript | `src/app/app.component.ts` |
| `cli` | Node.js ≥ 18, CommonJS, zero deps | `cli.js` |

---

## Cloning

Always use `--recurse-submodules`. A plain `git clone` leaves `backend/`,
`frontend/`, and `cli/` as **empty directories**.

```bash
git clone --recurse-submodules \
  https://github.com/lavanya-kuppusamy/nus-learning snip
cd snip
```

If you already cloned without the flag, initialise afterwards:

```bash
git submodule update --init --recursive
```

---

## Running all three pieces

Open three terminals from the `main` checkout:

```bash
# Terminal 1 — backend (port 3000)
cd backend
bun start
# Snip listening on port 3000

# Terminal 2 — frontend SPA (port 4200)
cd frontend
npm install
npx ng serve
# Navigate to http://localhost:4200

# Terminal 3 — CLI
cd cli
node cli.js help           # usage
node cli.js ls             # list all shortened links
node cli.js add https://example.com/very/long/path
node cli.js open <code>    # opens in default browser
```

Override the backend URL for any client:

```bash
SNIP_API=https://my-snip.example.com node cli.js ls
```

---

## Update workflow

After committing and pushing changes **inside a submodule**, the superproject's
pointer still points at the old commit. Advance it like this:

```bash
# 1. Make, commit, and push changes inside the submodule
cd backend
git add -A
git commit -m "fix: something"
git push

# 2. Back in the superproject, pull the latest tracked commit and bump the pointer
cd ..
git submodule update --remote backend   # fast-forwards to HEAD of origin/backend
git add backend
git commit -m "chore: bump backend submodule"
git push
```

To advance all three submodules at once:

```bash
git submodule update --remote
git add backend frontend cli
git commit -m "chore: bump all submodules"
git push
```

> **Tip:** `git submodule update --remote` fetches the latest commit on the tracked
> branch. Without `--remote` it only checks out the SHA already stored in the
> superproject — useful when you want a reproducible checkout of a known state.

---

## Release bundle

The `bundle` submodule (tracking `origin/bundle`) is **generated output** — never
edit it by hand.  It is assembled by `scripts/build-bundle.mjs`, which:

1. Updates `backend`, `frontend`, and `cli` to their branch tips.
2. Runs `npm install` + `ng build` inside `frontend/`.
3. Writes into `bundle/`:
   - `server.js` — copied from `backend/`
   - `cli.js` — copied from `cli/`
   - `public/` — Angular build output; Bun serves it as static files (`.env` sets `PUBLIC_DIR=./public`)
   - `package.json` — `"start": "bun server.js"` (no `"type"` field so `cli.js` also runs under plain Node)
   - `Dockerfile` — `FROM oven/bun:1-alpine`, exposes port 3000
   - `.dockerignore` and `railway.json` (DOCKERFILE builder)
4. Commits the result inside `bundle/` and bumps the superproject pointer on `main` — each step is a safe no-op if nothing changed.

**Rebuild and publish:**

```bash
node scripts/build-bundle.mjs          # local commit only
node scripts/build-bundle.mjs --push   # commit + push bundle branch + main
```

**Run the self-contained bundle locally:**

```bash
cd bundle
bun start          # serves API + SPA on :3000
# open http://localhost:3000
```

**Deploy to Railway:** push the `bundle` branch; Railway picks up `railway.json`
and builds from the `Dockerfile` automatically.
