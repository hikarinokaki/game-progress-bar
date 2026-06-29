# Game Progress Bar — Agent Guide

## Commands

- `npm run build:frontend` — bundle frontend JS with esbuild (entry: `src/public/js/main.js` → output: `dist/bundle.js`)
- `npm start` — run server at `src/server.js`
- `npm test` — vitest run (98 tests across 4 test files)
- `npm run test:watch` — vitest watch mode
- `npm run fallow` — run fallow static analysis
- `npm run fallow:health` — fallow complexity/health analysis only
- `npm run format` — prettier (no other formatter/linter for CI)

## Architecture

- **Express 5** (not Express 4) — verify passport/passport-steam-openid compatibility on upgrade
- `src/server.js` → `src/app.js` → routes under `BASE_PATH` (env var, default `""`)
- Frontend: vanilla JS modules bundled via esbuild into `dist/bundle.js`; served under `BASE_PATH/dist`
- Two pages: `index.html` (config UI) + `bar.html` (OBS browser source, driven entirely by URL params)
- Auth: `passport-steam-openid` (not `passport-steam`) with `profile: false` — skips the broken `GetPlayerSummaries` API call. User profile is built from the OpenID identifier (Steam ID only, no display name/avatar).

## Fragile Parts

- **HLTB session** (`src/gameDataFetcher.js`): A persistent headless Chromium browser navigates howlongtobeat.com search pages and intercepts `api/bleed` JSON responses for completion times. If HLTB changes their site or API, it will break. The browser session is initialized at server startup and stays alive until shutdown.
- **Steam API key restrictions**: The current API key returns 403 for `GetPlayerSummaries` and 401 for `GetOwnedGames`. Auth works (profile is built from OpenID), but the game library won't load until a key with proper permissions is used.
- **shared.js (bar logic)**: At 1297 lines, `src/public/js/bar/shared.js` is the biggest complexity hotspot. The drag system (`setupDragEnvironment`, `onPointerMove`, `onPointerUp`, `onPointerDown`) accounts for ~800 lines and is tightly coupled to DOM/iframe messaging. `parseParams` is cyclomatic 34. Refactoring this file is the top priority.

## Testing

- **Framework**: Vitest with jsdom environment
- **Test location**: `test/` directory, mirrors source structure
- **4 test files, 98 tests**:
  - `test/utils.test.js` — pure utility functions
  - `test/bar/logic.test.js` — extracted bar logic (secondsToNaturalTime, command parsers, validation, todos)
  - `test/state.test.js` — config UI state setters
  - `test/api.controller.test.js` — server API controller (with mocked `getGameMaxTime` via dependency injection)
- **Mocking pattern for CJS controllers**: Pass mock as second arg (`require("../controllers/api.controller")(libraryCache, mockFn)`)
- **Style plugins** (`gradientStyle.js`, `maskStyle.js`, etc.) and DOM-heavy files (`progressBar.js`, `shared.js` drag system) have no tests yet — are tightly coupled to browser DOM

## Fallow (static analysis)

- `.fallowrc.json` configures proper esbuild entry points (`src/public/js/main.js`, `src/public/js/bar.js`)
- Metrics: MI 93.2, 0% dead exports, 1 refactoring target remaining (shared.js complexity)
- Run `npm run fallow` before major refactors to verify no regressions
- Known false positive: `src/public/styles.css` is reported as dead (loaded from HTML, not JS)
- Test files are automatically excluded from dead-code analysis

## Upcoming: shared.js Refactoring Priority

`src/public/js/bar/shared.js` needs splitting. Current structure (functions-to-extract):

1. **Drag system** (`setupDragEnvironment` 442L, `onPointerMove` 141L, `onPointerUp` 129L, `onPointerDown` 103L, `applySnapAbs` 57L, `updateSnapGuides` 34L, `setCursorForTarget` 13L, `getBarCanvasBounds` 15L, `closestCandidate` 14L) → extract to `bar/drag.js`
2. **URL management** (`updateURL` 52L, `parseParams` 61L) — `parseParams` is already partially refactored to use `logic.js` helpers. The remaining DOM-dependent part (reading `window.location.search`, setting `data-theme` on document) stays, but param validation uses `logic.js`
3. **Timer** (`initBar` timer logic, `currentValue` hoisting, `setProgressValue` callback) → extract to `bar/timer.js`
4. **Twitch** (`initTwitch` 100L, `twitchClient`, `toggleTodo` 5L) → extract to `bar/twitch.js`
5. **Rendering** (`renderMilestones` 54L, `renderTodos` 33L, `setupTitle`, `applyPositions`, `initCanvas`, `makeAbsolute`, `updateDisplay`, `setElementPosition`, `applyFontSizes`) → could stay in `shared.js` or go to `bar/render.js`
6. **PostMessage handling** (the `window.addEventListener("message", ...)` block in `initBar`) → belongs with the drag system

**Strategy**: Extract one module at a time, starting with the least-coupled (timer), then twitch, then rendering, and finally the drag system. Run `npm test && npm run build:frontend && npm run fallow` after each extraction to confirm zero regressions.

**Key invariants to preserve**:

- `currentValue` must be hoisted to function scope accessible by both timer interval and `setProgressValue` callback
- `params` object is mutated in-place (toggleTodo, timer, etc.)
- `updateURL` reads `params.start` and `params.max` directly (not the `currentValue` variable — intentional)
- Twitch `callbacks.setProgressValue` must update `currentValue` AND `params.start` AND call `updateProgress`/`updateDisplay`/`updateURL`
- Style plugin lifecycle: `getStyle(params.style).init(container, params)` then `style.update(element, value, max, params)`

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
