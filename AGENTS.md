# Game Progress Bar — Agent Guide

## Commands

- `npm run build:frontend` — bundle frontend JS with esbuild (entry: `src/public/js/main.js` → output: `dist/bundle.js`)
- `npm start` — run server at `src/server.js`
- `npm test` — vitest run (135 tests across 6 test files)
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
- **HLTB auth token expiry**: The Puppeteer session must periodically re-fetch the HLTB auth token; if it expires mid-session, `getGameMaxTime` returns 403 until the next refresh cycle.
- **Twitch tmi.js**: Bundled via esbuild into `dist/bar.bundle.js` (~64 KB total). If tmi.js changes its API or CDN dependency, the chat command system breaks.

## Module Architecture (bar page)

| Module      | Lines | Exports                                                                                                                                               | Role                                                           |
| ----------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `shared.js` | 175   | `initBar`                                                                                                                                             | Orchestrator: `parseParams`, `updateURL`, postMessage listener |
| `logic.js`  | 116   | `secondsToNaturalTime`, `rectsIntersect`, validators, parsers                                                                                         | Pure functions, no DOM                                         |
| `timer.js`  | 24    | `createTimer`                                                                                                                                         | Owns `currentValue`, `setInterval` tick                        |
| `twitch.js` | 107   | `initTwitch`                                                                                                                                          | tmi.js chat client, todo toggle                                |
| `render.js` | 215   | `canvasState`, `initCanvas`, `makeAbsolute`, `applyPositions`, `setElementPosition`, `updateDisplay`, `renderMilestones`, `renderTodos`, `setupTitle` | DOM rendering, canvas scale state                              |
| `drag.js`   | 726   | `setupDragEnvironment`, `setSnapEnabled`                                                                                                              | Pointer-based drag/resize/select/snap                          |

**Key invariants**:

- `currentValue` lives in `timer.js` (module-level closure via `createTimer`), accessible via `getCurrentValue`/`setCurrentValue`
- `params` object is mutated in-place (toggleTodo, timer, etc.)
- `updateURL` reads `params.start` and `params.max` directly (not through `timer.getCurrentValue()` — intentional)
- Twitch `callbacks.setProgressValue` is `timer.setCurrentValue`, which updates `currentValue` AND `params.start` AND calls `onProgressChange` → `updateProgress`/`updateDisplay`/`updateURL`
- Style plugin lifecycle: `getStyle(params.style).init(container, params)` then `style.update(element, value, max, params)`
- `canvasState` (`render.js:3`) is a mutable object passed by reference — allows `drag.js` and `render.js` to share the current canvas scale

## Testing

- **Framework**: Vitest with jsdom environment
- **Test location**: `test/` directory, mirrors source structure
- **6 test files, ~135 tests**:
  - `test/utils.test.js` — pure utility functions
  - `test/bar/logic.test.js` — extracted bar logic (secondsToNaturalTime, command parsers, validation, todos)
  - `test/bar/timer.test.js` — createTimer tick, get/set currentValue
  - `test/bar/drag.test.js` — drag helpers (geometry, snap, candidates)
  - `test/state.test.js` — config UI state setters
  - `test/api.controller.test.js` — server API controller (with mocked `getGameMaxTime` via dependency injection)
- **Mocking pattern for CJS controllers**: Pass mock as second arg (`require("../controllers/api.controller")(libraryCache, mockFn)`)
- **DOM tests** (`drag.test.js`): set up minimal DOM elements (progressContainer, title, percentage, todoContainer) with style properties; test geometry/snap functions that depend on `document.getElementById`

## Fallow (static analysis)

- `.fallowrc.json` configures proper esbuild entry points (`src/public/js/main.js`, `src/public/js/bar.js`)
- Metrics: MI 92.8, 0% dead exports, 2 refactoring targets (logic.js complexity, drag.js onPointerMove complexity)
- Run `npm run fallow` before major refactors to verify no regressions
- Known false positives:
  - `src/public/styles.css` — reported as dead (loaded from HTML, not JS)
  - `src/public/bar.html:1 ./dist/bar.bundle.js` and `src/public/index.html:1 ./dist/bundle.js` — HTML plugin can't resolve esbuild output paths
- Test files are automatically excluded from dead-code analysis

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

- On push to `main`: `npm ci` → `npm test` → `npm run fallow` → `npm run build:frontend` → Docker build/push → **SSH into VPS** (`progress.ookaminohikari.com`) to `docker compose pull && docker compose up -d`
- Requires repo secret `SSH_PRIVATE_KEY` (root SSH key for the VPS)
- The hostname is a DNS A record managed by the `vps-config` Terraform project — idempotent across VPS IP changes

## Style

- CommonJS server, ES module frontend (bundled by esbuild)
- Prettier with `--list-different` for formatting checks
- No lint/typecheck in CI or pre-commit
