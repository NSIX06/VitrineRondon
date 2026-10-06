---
name: security-skill-check
description: Use when auditing the security posture of this project, reviewing code for vulnerabilities, or producing a security score. Runs 35 mechanical checks (secrets, inputs, auth, dependencies, headers, config) against the real files and a real `npm audit`, then prints a 0-100 score, a per-category breakdown and the list of problems found.
---

# security-skill-check

## Overview

A mechanical security audit. Nothing here is a judgement call: a single Node script
walks the repository, runs 35 checks over the real files plus a real `npm audit`, and
every point awarded or deducted traces back to a command that actually ran. Two runs
on the same tree produce the same number.

The score is **0-100** across six categories, with a per-category breakdown and a
severity-ordered list of findings that include file paths and line numbers.

## Verify command

```bash
node .claude/skills/security-skill-check/scripts/check.js --checks
```

That prints one line per check — `PASS` / `PARTIAL` / `FAIL`, points earned, check id,
and the problem when one was found — so the result is machine-checkable and diffable
between runs. It is the command to use for autoresearch / CI verification.

## All modes

| Command | Output |
|---|---|
| `node .claude/skills/security-skill-check/scripts/check.js` | Full human report: score, breakdown bars, issues with file:line |
| `… check.js --checks` | One line per check (**verify command**) |
| `… check.js --score` | The number alone, e.g. `78` — for CI gates |
| `… check.js --json` | `{score, breakdown, checks[], issues[]}` for tooling |
| `… --no-audit` | Skips `npm audit` (fast/offline). DEPS audit checks then score 0 and are labelled `UNVERIFIED` — the score is *not* silently inflated. |

Run it from the repository root; paths in the report are relative to the working directory.

## Categories (100 pts, 35 checks)

| Category | Pts | Checks |
|---|---|---|
| SECRETS | 20 | `.env` gitignored, no real `.env` exposed, no credential literals, no secret-shaped assignments, `.env.example` present |
| INPUTS  | 25 | validation library installed, route files validate payloads, no `eval`, no raw-HTML sinks, no concatenated SQL, no shell injection, no path traversal, no open redirect |
| AUTH    | 20 | auth middleware exists, mutating routes guarded, password hashing, no plaintext compare, secret from env, cookie flags, rate limiting, no hardcoded privilege flag |
| DEPS    | 15 | `npm audit` critical/high, `npm audit` moderate/low, lockfile per workspace, no abandoned packages |
| HEADERS | 10 | 5 security response headers, CORS scoped to known origins, HTTPS enforced |
| CONFIG  | 10 | `.gitignore` hygiene, TLS verification never disabled, no error/stack leak, body size limit, env-driven DB config, no debug flag forced on, CI dependency scanning |

## Report format

```
=== SECURITY SKILL CHECK ===

SCORE: 78/100  (grade C)
100 files scanned | 35 checks | npm audit: backend, frontend

BREAKDOWN:
  SECRETS  [20/20] ####################
  INPUTS   [23/25] ##################..
  AUTH     [19/20] ###################.
  DEPS     [ 8/15] ###########.........
  HEADERS  [ 0/10] ....................
  CONFIG   [ 8/10] ################....

ISSUES (9):
  [HIGH    ] -5pt DEPS/audit-critical: npm audit: 0 critical, 3 high (backend, frontend)
  [HIGH    ] -3pt HEADERS/cors-scoped: CORS allows any origin (*)
               -> backend/src/app.js:15  cors()
  [HIGH    ] -2pt INPUTS/routes-validated: 3/9 route file(s) have no visible input validation
               -> backend/src/routes/auditoriaRoutes.js:1
  ...

PASSING (25/35):
  env-gitignored, env-not-tracked, no-known-credentials, ...
```

Grades: A >= 90, B >= 80, C >= 70, D >= 60, E >= 40, F below.
Issues are ordered CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO, then by points lost.

## Scoring detail

### SECRETS — 20 pts

| Check | Pts | How it is decided |
|---|---|---|
| `env-gitignored` | 5 | a `.env` / `.env*` line in any `.gitignore` (root, `backend/`, `frontend/`) |
| `env-not-tracked` | 2 | a real (non-`.example`) `.env` exists **and** is not covered by `.gitignore` → 0 |
| `no-known-credentials` | 7 | 9 high-confidence patterns: `AKIA…`, `sk-…`, `sk_live_…`, `ghp_…`, `AIza…`, `xox?-…`, literal JWT, `BEGIN … PRIVATE KEY`, DB URI with inline password. Any hit → 0 |
| `no-secret-assignments` | 4 | `key/secret/password/token/… = "<12+ chars>"`, minus 2 per hit. Skipped when the value is a placeholder (`process.env`, `${…}`, `your_`, `changeme`, `example`, `xxx`, `here`, …) |
| `env-example` | 2 | any `.env.example` / `.sample` / `.template` at root or per workspace |

`.env` files are excluded from the literal scans on purpose — they are *meant* to hold
secrets. Their risk is measured by whether git can see them, not by their contents.

### INPUTS — 25 pts

| Check | Pts | How it is decided |
|---|---|---|
| `validation-lib` | 4 | zod / joi / yup / express-validator / class-validator / ajv / valibot / superstruct in any `package.json` |
| `routes-validated` | 7 | **proportional**: of every file declaring `router.get|post|…`, the share that also references a schema or validator — in the route file itself **or in a local module it imports** (validation usually lives in the controller). 6 of 9 files → `round(7*6/9)` = 5 pts |
| `no-eval` | 2 | `eval(` or `new Function(` |
| `no-html-injection` | 3 | `dangerouslySetInnerHTML`, `.innerHTML =`, `.outerHTML =`, `insertAdjacentHTML`, `document.write` — minus 1 per hit |
| `no-sql-injection` | 4 | `$queryRawUnsafe`, `$executeRawUnsafe`, or a SQL string built with `+` / `${}` — minus 2 per hit |
| `no-command-injection` | 2 | `exec`/`spawn` whose first argument is interpolated |
| `no-path-traversal` | 2 | `readFile`/`sendFile`/`unlink`/… called directly on `req.params|query|body` |
| `no-open-redirect` | 1 | `res.redirect(req.query…)` |

### AUTH — 20 pts

| Check | Pts | How it is decided |
|---|---|---|
| `auth-middleware` | 4 | any of `requireAuth`, `ensureAuth`, `isAuthenticated`, `verifyToken`, `protect`, `checkAuth`, `passport.authenticate`, `getServerSession`, `withAuth`, `authMiddleware` |
| `mutations-guarded` | 3 | **proportional**: of files declaring POST/PUT/PATCH/DELETE routes, the share referencing an auth guard |
| `password-hashing` | 4 | if the code mentions passwords at all, it must use bcrypt/argon2/scrypt/pbkdf2 (dependency or call site) |
| `no-plaintext-compare` | 2 | `password === req.body…` / `=== user.…` / `=== "literal"` |
| `jwt-secret-env` | 3 | if JWT/session is used: no hardcoded `*_SECRET = "…"` **and** a `process.env.*SECRET|JWT|TOKEN|SESSION` read exists |
| `cookie-flags` | 2 | if cookies/sessions are set: both `httpOnly: true` and `sameSite:` present |
| `rate-limit` | 1 | express-rate-limit / rate-limiter-flexible / @fastify/rate-limit / express-slow-down, or a `rateLimit` call |
| `no-authz-bypass` | 1 | `isAdmin/role/admin = true` hardcoded, or a `TODO/FIXME` within 40 chars of "auth" |

Checks that do not apply score full marks (a project with no cookies is not penalised
for cookie flags) — the denominator stays 100 either way.

### DEPS — 15 pts

`npm audit --json` runs in **every** directory with a `package.json` plus a lockfile or
`node_modules` (so both `backend/` and `frontend/` in this monorepo), and the counts are summed.

| Check | Pts | Thresholds |
|---|---|---|
| `audit-critical` | 7 | any critical → 0 · 0 high → 7 · 1-2 high → 4 · 3-5 high → 2 · >5 high → 0 |
| `audit-moderate` | 4 | 0 → 4 · 1-3 → 3 · 4-10 → 2 · >10 → 0 |
| `lockfile` | 2 | every `package.json` has `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` |
| `no-abandoned` | 2 | none of `request`, `node-uuid`, `left-pad`, `gulp-util`, `cryptiles`, `hoek`, `tunnel-agent`, `har-validator`, `growl`, `sha.js`, `crypto`, `querystring` |

If `npm audit` cannot run (offline, no lockfile, `--no-audit`), the two audit checks score
**0 and are reported as `UNVERIFIED`** rather than assumed clean. A perfect 100 therefore
requires a successful audit.

### HEADERS — 10 pts

| Check | Pts | How it is decided |
|---|---|---|
| `security-headers` | 5 | **proportional over 5**: CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, HSTS, `Referrer-Policy`. Installing/calling `helmet` satisfies all five |
| `cors-scoped` | 3 | CORS configured **and** no wildcard: bare `cors()`, `origin: "*"` or `Access-Control-Allow-Origin: *` → 0 |
| `https-enforced` | 2 | `secure: true`/`NODE_ENV`-gated cookie, `trust proxy`, `req.secure`, or `x-forwarded-proto` |

### CONFIG — 10 pts

| Check | Pts | How it is decided |
|---|---|---|
| `gitignore-hygiene` | 2 | `.gitignore` covers `node_modules`, build output, and `.env` |
| `no-tls-bypass` | 2 | no `NODE_TLS_REJECT_UNAUTHORIZED=0`, `rejectUnauthorized: false`, `strictSSL: false` |
| `no-error-leak` | 2 | no `res.json/send` carrying `err.stack`, `err.message`, or `error: err` — minus 1 per hit |
| `body-limit` | 1 | if `express.json`/`bodyParser` is used, a `limit: '…kb|mb'` is set |
| `env-driven-config` | 1 | DB connection read from `process.env`, not a literal |
| `no-debug-left-on` | 1 | no `debug: true` / `devtools: true` / `sourcemap: true` pinned in a build config |
| `scan-automation` | 1 | `.github/dependabot.yml`, `renovate.json`, a workflow mentioning audit/codeql/snyk/trivy, or an `audit` npm script |

## What the script skips

Directories: `node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.nuxt`,
`.svelte-kit`, `coverage`, `.cache`, `.turbo`, `.venv`, `venv`, `__pycache__`,
`vendor`, `.claude`, `playwright-report`, `test-results`.

Files: lockfiles, anything over 600 KB, and — for the vulnerability scans only — test
files (`*.test.*`, `*.spec.*`, `tests/`, `__tests__/`, `e2e/`, `testes*/`) and
`*.example` / `*.sample` / `*.template`. Hard cap of 6000 files.

The walker is pure Node with no `grep`/`rg` dependency, so Windows, macOS and Linux
produce identical results.

## How to run the audit

1. Run the full report from the repository root:
   `node .claude/skills/security-skill-check/scripts/check.js`
2. Print the score, the breakdown and the issue list verbatim — do not re-score by hand
   and do not soften the findings.
3. Read each flagged `file:line` before proposing a fix; the patterns are deliberately
   broad, so confirm the finding is real and say so when it is a false positive.
4. Recommend fixes highest-impact first: CRITICAL, then whichever category lost the most
   points. Attack the category bars, not the issue count.
5. Re-run `--checks` after fixing, and compare check ids to prove what actually changed.

## Known limits

- Pattern matching, not dataflow analysis. It finds a raw HTML sink; it cannot prove the
  value reaching it is attacker-controlled. Verify before fixing.
- `routes-validated` and `mutations-guarded` work at **file** granularity: one validated
  route in a file marks the file validated. They detect "nobody validates here", not
  "route #4 forgot to". `routes-validated` follows relative imports one level deep;
  `mutations-guarded` does not.
- Validation by allowlist lookup (`const def = TIPOS[req.params.tipo]; if (!def) …`) is
  safe but carries none of the matched keywords, so it reads as unvalidated. Confirm
  before adding a schema just to clear the check.
- Only the JS/TS ecosystem is scored. Python, Go, Ruby and PHP files are not scanned,
  and only `npm audit` is consulted for dependencies.
- No network calls other than `npm audit` — no CVE lookups beyond the registry advisory
  data npm returns.
