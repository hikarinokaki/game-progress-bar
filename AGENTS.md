# Game Progress Bar — Agent Guide

## Commands

- `npm run build:frontend` — bundle frontend JS with esbuild (entry: `src/public/js/main.js` → output: `dist/bundle.js`)
- `npm start` — run server at `src/server.js`
- `npm run format` — prettier (no other formatter/linter for CI)
- No tests exist (`npm test` exits 1)

## Architecture

- **Express 5** (not Express 4) — verify passport/passport-steam-openid compatibility on upgrade
- `src/server.js` → `src/app.js` → routes under `BASE_PATH` (env var, default `""`)
- Frontend: vanilla JS modules bundled via esbuild into `dist/bundle.js`; served under `BASE_PATH/dist`
- Two pages: `index.html` (config UI) + `bar.html` (OBS browser source, driven entirely by URL params)
- Auth: `passport-steam-openid` (not `passport-steam`) with `profile: false` — skips the broken `GetPlayerSummaries` API call. User profile is built from the OpenID identifier (Steam ID only, no display name/avatar).

## Fragile Parts

- **HLTB session** (`src/gameDataFetcher.js`): A persistent headless Chromium browser navigates howlongtobeat.com search pages and intercepts `api/bleed` JSON responses for completion times. If HLTB changes their site or API, it will break. The browser session is initialized at server startup and stays alive until shutdown.
- **Steam API key restrictions**: The current API key returns 403 for `GetPlayerSummaries` and 401 for `GetOwnedGames`. Auth works (profile is built from OpenID), but the game library won't load until a key with proper permissions is used.

## Required Env Vars

`STEAM_API_KEY`, `BASE_URL`, `BASE_PATH` (usually `/game-progress-bar`), `SESSION_SECRET`, `NODE_ENV=production`, `PORT`

## Local Development

- `cp .env.example .env` — fill in your `STEAM_API_KEY`
- `npm start` — runs on `http://localhost:3000`
- `BASE_URL` and `SESSION_SECRET` default to safe dev values if not set
- Steam OpenID auth works with `localhost` (browser-based redirect)
- Puppeteer/Chromium needed only for HLTB auth token (optional for dev)

## Docker

- `Node 20-alpine` + Chromium (for Puppeteer → large image)
- Build: `npm ci` → `npm run build:frontend` → `npm prune --production`
- `dist/` is gitignored; built fresh in Docker

## CI (`deploy.yml`)

- On push to `main`: builds Docker image, tags `latest`+`sha`, pushes to GHCR, then **SSHes into the VPS** (`progress.ookaminohikari.com`) to `docker compose pull && docker compose up -d`
- Requires repo secret `SSH_PRIVATE_KEY` (root SSH key for the VPS)
- The hostname is a DNS A record managed by the `vps-config` Terraform project — idempotent across VPS IP changes

## Style

- CommonJS server, ES module frontend (bundled by esbuild)
- Prettier with `--list-different` for formatting checks
- No lint/typecheck in CI or pre-commit
