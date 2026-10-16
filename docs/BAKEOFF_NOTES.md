# Stack comparison notebook

## Reproducible measurement procedure

Use Node 24 and the committed lockfile. Record hardware/OS, Node version, dependency versions (`npm ls --depth=0`), date, and dataset size alongside each result. Avoid comparing development-mode timings to production-mode timings.

| Measure              | Procedure                                                                                                  | Result                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Install time         | Time `npm ci` with a noted warm/cold package cache                                                         | Not yet measured under controlled conditions |
| Production build     | Time `npm run build`, noting cold or warm `.next` cache                                                    | Record on review machine                     |
| Startup              | Time `npm start` to the ready message                                                                      | Record on review machine                     |
| SSR response         | Measure authenticated overview/project document responses, 10 runs; report median and range                | Record on review machine                     |
| Browser experience   | DevTools mobile emulation, Lighthouse production build; record viewport, version, LCP, CLS, transferred JS | Record on review machine                     |
| Core workflow        | Time signup → client → project → task → client reply with the same fixture in each stack                   | Record on review machine                     |
| Developer experience | Note routing, data validation, auth complexity, deployment requirements, and debugging friction            | See observations below                       |

Do not publish a comparative winner before implementing and measuring the other stack. SQLite here and a hosted database elsewhere would introduce a database/network confound.

## Observations

Server components read SQLite directly, avoiding duplicate API types and client fetch state. Server actions keep HTML form submissions close to the server's permission checks. The main tradeoff is discipline: every action and database read must enforce authorization; hiding controls is insufficient. Node's SQLite driver avoids native addon installation, but requires a recent Node runtime and persistent disk hosting. Synchronous queries are reasonable for this small prototype; concurrency and deployment options should be revisited for a real service.

## Automated validation

Validated October 16, 2026 on Windows, Node 24.15.0, Next.js 16.4.2, with the committed dependency lockfile:

- `npm test`: 2 tests passed, covering salted password verification, cross-workspace denial, linked/unlinked client access, internal task filtering, and one-account association constraints.
- `npm run build`: passed; overview and login are dynamically server-rendered.
- Playwright production browser workflow: passed using the machine's existing Chromium. Covers registration, adding a client, creating a project, visible/internal tasks, invitation signup, client replies, logout and returning login, unrelated-owner denial, and a valid owner action replayed with a client session. The replay receives an authorization rejection, and no extra task is created.
- Responsive check at 390 × 844: no horizontal overflow. Desktop screenshot at 1440 × 1000 and full mobile project screenshot reviewed visually.

The initial build exposed concurrent SQLite schema initialization locking. Adding a busy timeout before schema setup resolved it. Browser tests run against production to avoid the development overlay interfering with interaction checks. Full CRUD edge cases, real-device testing, load testing, accessibility auditing, and a hosted deployment remain outside this verification. Local browser tests use generated accounts, not real client data. Timing observations here are smoke checks, not controlled stack comparison results.
