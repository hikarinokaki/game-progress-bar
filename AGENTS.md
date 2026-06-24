# Game Progress Bar — Agent Guide

## Commands

- `npm run build:frontend` — bundle frontend JS with esbuild (entry: `src/public/js/main.js` → output: `dist/bundle.js`)
- `npm start` — run server at `src/server.js`
- `npm run format` — prettier (no other formatter/linter for CI)
- No tests exist (`npm test` exits 1)

## Architecture

- **Express 5** (not Express 4) — verify passport/passport-steam compatibility on upgrade
- `src/server.js` → `src/app.js` → routes under `BASE_PATH` (env var, default `""`)
- Frontend: vanilla JS modules bundled via esbuild into `dist/bundle.js`; served under `BASE_PATH/dist`
- Two pages: `index.html` (config UI) + `bar.html` (OBS browser source, driven entirely by URL params)

## Fragile Parts

- **HLTB auth token** (`src/gameDataFetcher.js:22-201`): Puppeteer scrapes howlongtobeat.com to intercept `x-auth-token` from network traffic. Will break if HLTB changes their site. If it fails, completion-time buttons won't load.
- **passport-steam + Express 5**: `passport-steam@1.0.18` hasn't been updated in years; may break with Express 5 routing/session changes. `returnURL` includes `BASE_PATH` but `realm` does not.
- **steam-web patch** (`patches/steam-web+0.4.0.patch`): `steam-web@0.4.0` uses `http` on port 80. The patch switches to `https` on port 443 (applied by `patch-package` in `postinstall`). Remove if you ever upgrade `steam-web` beyond 0.4.0.

## Required Env Vars

`STEAM_API_KEY`, `BASE_URL`, `BASE_PATH` (usually `/game-progress-bar`), `SESSION_SECRET`, `NODE_ENV=production`, `PORT`

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
