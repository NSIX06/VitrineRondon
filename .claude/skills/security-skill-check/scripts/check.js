#!/usr/bin/env node
/**
 * security-skill-check — mechanical security scorer (0-100).
 *
 * Pure Node (no grep/rg dependency) so it behaves identically on Windows,
 * macOS and Linux. Every point awarded comes from a real check over real
 * files, or from a real `npm audit` run.
 *
 * Usage:
 *   node .claude/skills/security-skill-check/scripts/check.js            # full report
 *   node .claude/skills/security-skill-check/scripts/check.js --checks   # one line per check (verify)
 *   node .claude/skills/security-skill-check/scripts/check.js --score    # just the number
 *   node .claude/skills/security-skill-check/scripts/check.js --json     # machine readable
 *   --no-audit   skip `npm audit` (fast/offline run; DEPS audit scores 0/UNVERIFIED)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const ARGV = process.argv.slice(2);
const MODE = ARGV.includes('--json') ? 'json'
  : ARGV.includes('--checks') ? 'checks'
    : ARGV.includes('--score') ? 'score'
      : 'report';
const SKIP_AUDIT = ARGV.includes('--no-audit');

// --- file collection --------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  'coverage', '.cache', '.turbo', '.venv', 'venv', '__pycache__', 'vendor',
  '.claude', 'playwright-report', 'test-results'
]);

const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte']);
const CONF_EXT = new Set(['.json', '.yml', '.yaml', '.toml', '.ini', '.sh', '.ps1', '.properties', '.xml', '.html', '.prisma']);
const MAX_BYTES = 600 * 1024;
const MAX_FILES = 6000;

const files = [];
(function walk(dir) {
  if (files.length >= MAX_FILES) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      const isEnv = e.name === '.env' || e.name.startsWith('.env.');
      if (/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock)$/.test(e.name)) continue;
      if (!CODE_EXT.has(ext) && !CONF_EXT.has(ext) && !isEnv) continue;
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (st.size > MAX_BYTES) continue;
      let content;
      try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
      files.push({
        rel: path.relative(ROOT, full).split(path.sep).join('/'),
        name: e.name,
        ext: isEnv ? '.env' : ext,
        content
      });
      if (files.length >= MAX_FILES) return;
    }
  }
})(ROOT);

const isTest = f => /(^|\/)(tests?|__tests__|e2e|testes[^/]*)\//i.test(f.rel)
  || /\.(test|spec)\.[a-z]+$/i.test(f.name)
  || /\.(cy|e2e)\./i.test(f.name);
const isExample = f => /\.example|\.sample|\.template/i.test(f.name);

const ALL_CODE = files.filter(f => CODE_EXT.has(f.ext));
const CODE = ALL_CODE.filter(f => !isTest(f));
// .env files are *supposed* to hold secrets; their exposure is judged by
// env-gitignored / env-not-tracked, so they stay out of the literal scans.
const SCANNABLE = files.filter(f => !isTest(f) && !isExample(f) && f.ext !== '.env');
const NON_TEST = files.filter(f => !isTest(f));

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

// --- scanning ---------------------------------------------------------------

function scan(re, set, reject) {
  const target = set || CODE;
  const hits = [];
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  for (const f of target) {
    const rx = new RegExp(re.source, flags);
    let m;
    while ((m = rx.exec(f.content)) !== null) {
      if (m[0].length === 0) { rx.lastIndex++; continue; }
      if (!reject || !reject(m[0], f)) {
        hits.push({
          file: f.rel,
          line: f.content.slice(0, m.index).split('\n').length,
          match: m[0].replace(/\s+/g, ' ').slice(0, 100)
        });
      }
    }
  }
  return hits;
}

function has(re, set) { return scan(re, set).length > 0; }

// --- result model -----------------------------------------------------------

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const results = [];

function add(cat, id, label, earned, max, sev, issue, refs) {
  results.push({
    cat, id, label,
    earned: Math.max(0, Math.min(max, Math.round(earned || 0))),
    max, sev: sev || 'LOW',
    issue: issue || null,
    refs: refs || []
  });
}

/** binary pass/fail check */
function gate(cat, id, label, pass, max, sev, issue, refs) {
  add(cat, id, label, pass ? max : 0, max, sev, pass ? null : issue, refs);
}

/** proportional credit: earned = max * (ok / total) */
function ratio(cat, id, label, ok, total, max, sev, issueFn, refs) {
  if (total === 0) return add(cat, id, label, max, max, sev, null, []);
  const r = ok / total;
  add(cat, id, label, max * r, max, sev, r >= 1 ? null : issueFn(ok, total), refs);
}

/** deduct `per` points for every finding */
function penalty(cat, id, label, hits, max, per, sev, issue) {
  add(cat, id, label, Math.max(0, max - hits.length * per), max, sev,
    hits.length ? issue + ' (' + hits.length + 'x)' : null, hits);
}

// ===========================================================================
// 1. SECRETS - 20 pts
// ===========================================================================

const gitignore = [read('.gitignore'), read('backend/.gitignore'), read('frontend/.gitignore')].join('\n');
const envIgnored = /^\s*\**\/?\.env\**\s*$/m.test(gitignore);
gate('SECRETS', 'env-gitignored', '.env listed in .gitignore', envIgnored, 5,
  'CRITICAL', '.env is not ignored by git - secrets can be committed');

const envFiles = files.filter(f => f.ext === '.env' && !isExample(f));
gate('SECRETS', 'env-not-tracked', 'no real .env exposed to git',
  !(envFiles.length > 0 && !envIgnored), 2,
  'CRITICAL', 'A real .env exists while .gitignore does not cover it',
  envFiles.map(f => ({ file: f.rel, line: 1 })));

const HIGH_CONF = [
  /AKIA[0-9A-Z]{16}/,                                        // AWS access key id
  /\bsk-[A-Za-z0-9_-]{20,}/,                                 // OpenAI-style token
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/,                     // Stripe
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,                            // GitHub token
  /\bAIza[0-9A-Za-z_-]{30,}/,                                // Google API key
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,                          // Slack
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./,        // JWT literal
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^\s'"`$:]+:[^\s'"`@${]+@/
];
const hardHits = [];
for (const re of HIGH_CONF) hardHits.push(...scan(re, SCANNABLE));
penalty('SECRETS', 'no-known-credentials', 'no recognizable credential literals',
  hardHits, 7, 7, 'CRITICAL', 'Hardcoded credential / private key in source');

const PLACEHOLDER = /(process\.env|import\.meta\.env|\$\{|<|your[_-]?|xxx|change[_-]?me|example|placeholder|dummy|fake|todo|insert|\.\.\.|\*\*\*|here)/i;
const assignHits = scan(
  /\b(?:api[_-]?key|apikey|secret|secret[_-]?key|password|passwd|pwd|token|access[_-]?key|client[_-]?secret|private[_-]?key|auth[_-]?token|connection[_-]?string)\s*[:=]\s*(['"`])[^'"`\n]{12,}\1/i,
  SCANNABLE,
  m => PLACEHOLDER.test(m)
);
penalty('SECRETS', 'no-secret-assignments', 'no secret-shaped literal assignments',
  assignHits, 4, 2, 'HIGH', 'Possible hardcoded secret assignment');

gate('SECRETS', 'env-example', '.env.example documents required vars',
  files.some(f => f.ext === '.env' && isExample(f)) || exists('.env.example')
  || exists('backend/.env.example') || exists('frontend/.env.example'), 2,
  'LOW', 'No .env.example - required env vars are undocumented');

// ===========================================================================
// 2. INPUTS - 25 pts
// ===========================================================================

const pkgJsons = files.filter(f => f.name === 'package.json');
const allDeps = {};
for (const p of pkgJsons) {
  try {
    const j = JSON.parse(p.content);
    Object.assign(allDeps, j.dependencies || {}, j.devDependencies || {});
  } catch { /* malformed package.json */ }
}
const dep = name => Object.prototype.hasOwnProperty.call(allDeps, name);
const anyDep = names => names.some(dep);

gate('INPUTS', 'validation-lib', 'schema validation library installed',
  anyDep(['zod', 'joi', 'yup', 'express-validator', 'class-validator', 'ajv', 'valibot', 'superstruct']),
  4, 'HIGH', 'No validation library (zod/joi/yup/express-validator) in dependencies');

const routeHits = scan(/\b(?:router|app)\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*['"`][^'"`]*['"`]/i, CODE);
const mutating = routeHits.filter(h => /\.\s*(?:post|put|patch|delete)\s*\(/i.test(h.match));
const routeFiles = [...new Set(routeHits.map(h => h.file))];

const byRel = new Map(files.map(f => [f.rel, f]));

/**
 * A route file plus the local modules it imports, one level deep. Validation
 * usually lives in the controller or in a shared middleware, not inline in the
 * route declaration, so judging the route file alone flags correct code.
 */
function withLocalImports(rel) {
  const f = byRel.get(rel);
  if (!f) return '';
  const dir = path.posix.dirname(rel);
  let combined = f.content;
  const rx = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = rx.exec(f.content)) !== null) {
    const base = path.posix.normalize(path.posix.join(dir, m[1]));
    for (const cand of [base, base + '.js', base + '.ts', base + '/index.js']) {
      const dep = byRel.get(cand);
      if (dep) { combined += '\n' + dep.content; break; }
    }
  }
  return combined;
}

const VALIDATION_RE = /(zod|z\.object|Joi\.|yup\.|body\(|param\(|query\(|check\(|validat|schema)/i;
const validatedFiles = routeFiles.filter(rel => VALIDATION_RE.test(withLocalImports(rel)));
ratio('INPUTS', 'routes-validated', 'route files validate incoming payloads',
  validatedFiles.length, routeFiles.length, 7, 'HIGH',
  (ok, tot) => (tot - ok) + '/' + tot + ' route file(s) have no visible input validation',
  routeFiles.filter(r => !validatedFiles.includes(r)).map(r => ({ file: r, line: 1 })));

penalty('INPUTS', 'no-eval', 'no eval() / new Function()',
  scan(/\beval\s*\(|new\s+Function\s*\(/, CODE), 2, 2, 'HIGH', 'Dynamic code execution');

penalty('INPUTS', 'no-html-injection', 'no raw HTML injection sinks',
  scan(/dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/, CODE),
  3, 1, 'HIGH', 'Raw HTML sink (XSS risk)');

penalty('INPUTS', 'no-sql-injection', 'no unsafe / concatenated SQL',
  scan(/\$queryRawUnsafe|\$executeRawUnsafe|(?:query|execute)\s*\(\s*(?:['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE)[^'"]*['"]\s*\+|`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{)/i, CODE),
  4, 2, 'CRITICAL', 'SQL built by concatenation or raw-unsafe API');

penalty('INPUTS', 'no-command-injection', 'no shell command built from variables',
  scan(/\b(?:exec|execSync|spawnSync|spawn)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+)/, CODE),
  2, 2, 'CRITICAL', 'Shell command built from interpolated input');

penalty('INPUTS', 'no-path-traversal', 'no request data used as a filesystem path',
  scan(/(?:readFile|readFileSync|createReadStream|sendFile|unlink|writeFile)\s*\(\s*(?:req\.(?:params|query|body)|`[^`]*\$\{\s*req\.)/, CODE),
  2, 2, 'HIGH', 'Request data used directly as a filesystem path');

penalty('INPUTS', 'no-open-redirect', 'no redirect to unvalidated user input',
  scan(/res\.redirect\s*\(\s*req\.(?:query|params|body)/, CODE),
  1, 1, 'MEDIUM', 'Open redirect from request data');

// ===========================================================================
// 3. AUTH - 20 pts
// ===========================================================================

const AUTH_RE = /\b(?:auth(?:enticate)?(?:Middleware|Guard|Required)?|requireAuth|ensureAuth|isAuthenticated|verifyToken|protect|checkAuth|passport\.authenticate|getServerSession|withAuth)\b/;
gate('AUTH', 'auth-middleware', 'auth middleware / session guard exists',
  has(AUTH_RE, CODE), 4, 'CRITICAL', 'No authentication middleware or session guard found');

const mutFiles = [...new Set(mutating.map(h => h.file))];
const guardedMut = mutFiles.filter(rel => {
  const f = CODE.find(x => x.rel === rel);
  return f && AUTH_RE.test(f.content);
});
ratio('AUTH', 'mutations-guarded', 'mutating routes sit behind an auth guard',
  guardedMut.length, mutFiles.length, 3, 'HIGH',
  (ok, tot) => (tot - ok) + '/' + tot + ' file(s) with POST/PUT/PATCH/DELETE routes reference no auth guard',
  mutFiles.filter(r => !guardedMut.includes(r)).map(r => ({ file: r, line: 1 })));

const hashesPw = anyDep(['bcrypt', 'bcryptjs', '@node-rs/bcrypt', 'argon2', 'scrypt-kdf'])
  || has(/\b(?:bcrypt|argon2)\s*\.\s*(?:hash|compare|verify)|pbkdf2|scrypt\s*\(/, CODE);
const handlesPw = has(/\bpassword|\bsenha/i, CODE);
gate('AUTH', 'password-hashing', 'passwords hashed with bcrypt/argon2/scrypt',
  !handlesPw || hashesPw, 4, 'CRITICAL',
  'Passwords handled without a password hashing function');

penalty('AUTH', 'no-plaintext-compare', 'no plaintext password comparison',
  scan(/\b(?:password|senha)\w*\s*===?\s*(?:req\.body|user\.|['"`])|req\.body\.(?:password|senha)\s*===?/i, CODE),
  2, 2, 'CRITICAL', 'Password compared as plaintext');

const usesJwt = anyDep(['jsonwebtoken', 'jose', 'fast-jwt']) || has(/\bjwt\b/i, CODE);
const jwtHardcoded = scan(/(?:jwt|token|session)[_-]?secret\s*[:=]\s*['"`][^'"`\n]{4,}['"`]/i, SCANNABLE,
  m => /process\.env|\$\{/.test(m));
gate('AUTH', 'jwt-secret-env', 'token/session secret comes from the environment',
  !usesJwt || (jwtHardcoded.length === 0 && has(/process\.env\.[A-Z_]*(?:JWT|TOKEN|SECRET|SESSION)/, CODE)),
  3, 'CRITICAL', 'JWT/session secret is hardcoded or not read from env', jwtHardcoded);

const setsCookie = has(/res\.cookie\s*\(|cookie\s*:\s*\{|session\s*\(/, CODE);
const cookieHardened = has(/httpOnly\s*:\s*true/, CODE) && has(/sameSite\s*:/, CODE);
gate('AUTH', 'cookie-flags', 'cookies set httpOnly + sameSite',
  !setsCookie || cookieHardened, 2, 'HIGH',
  'Cookies/sessions without httpOnly + sameSite flags');

gate('AUTH', 'rate-limit', 'rate limiting present',
  anyDep(['express-rate-limit', 'rate-limiter-flexible', '@fastify/rate-limit', 'express-slow-down'])
  || has(/rateLimit|rate_limit|RateLimiter/, CODE), 1,
  'MEDIUM', 'No rate limiting - auth endpoints open to brute force');

penalty('AUTH', 'no-authz-bypass', 'no privilege flag hardcoded / auth TODO',
  scan(/(?:isAdmin|role|admin)\s*[:=]\s*true\s*(?:;|,|\)|$)|\/\/\s*(?:TODO|FIXME)[^\n]{0,40}auth/i, CODE),
  1, 1, 'MEDIUM', 'Hardcoded privilege flag or unresolved authorization TODO');

// ===========================================================================
// 4. DEPS - 15 pts
// ===========================================================================

const auditDirs = [];
for (const p of pkgJsons) {
  const d = path.dirname(path.join(ROOT, p.rel));
  if (fs.existsSync(path.join(d, 'package-lock.json')) || fs.existsSync(path.join(d, 'node_modules'))) {
    auditDirs.push(d);
  }
}
let vuln = null;
const auditedIn = [];
if (!SKIP_AUDIT && auditDirs.length) {
  vuln = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const d of auditDirs) {
    let raw = '';
    try {
      raw = execSync('npm audit --json', {
        cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180000
      });
    } catch (e) { raw = (e && e.stdout) || ''; }
    try {
      const v = JSON.parse(raw).metadata.vulnerabilities;
      vuln.critical += v.critical || 0;
      vuln.high += v.high || 0;
      vuln.moderate += v.moderate || 0;
      vuln.low += v.low || 0;
      auditedIn.push(path.relative(ROOT, d).split(path.sep).join('/') || '.');
    } catch { /* audit unavailable in this workspace */ }
  }
  if (!auditedIn.length) vuln = null;
}

if (vuln) {
  const pts = vuln.critical ? 0 : vuln.high === 0 ? 7 : vuln.high <= 2 ? 4 : vuln.high <= 5 ? 2 : 0;
  add('DEPS', 'audit-critical', 'npm audit: no critical/high vulnerabilities', pts, 7,
    vuln.critical ? 'CRITICAL' : 'HIGH',
    (vuln.critical || vuln.high)
      ? 'npm audit: ' + vuln.critical + ' critical, ' + vuln.high + ' high (' + auditedIn.join(', ') + ')'
      : null);
  const mod = vuln.moderate + vuln.low;
  add('DEPS', 'audit-moderate', 'npm audit: few moderate/low vulnerabilities',
    mod === 0 ? 4 : mod <= 3 ? 3 : mod <= 10 ? 2 : 0, 4, 'MEDIUM',
    mod ? 'npm audit: ' + vuln.moderate + ' moderate, ' + vuln.low + ' low' : null);
} else {
  const why = SKIP_AUDIT
    ? 'UNVERIFIED - run without --no-audit to score dependency risk'
    : 'UNVERIFIED - `npm audit` could not run (offline, or no lockfile/node_modules)';
  const sev = SKIP_AUDIT ? 'INFO' : 'MEDIUM';
  add('DEPS', 'audit-critical', 'npm audit: no critical/high vulnerabilities', 0, 7, sev, why);
  add('DEPS', 'audit-moderate', 'npm audit: few moderate/low vulnerabilities', 0, 4, sev, why);
}

gate('DEPS', 'lockfile', 'every package.json has a lockfile',
  pkgJsons.length > 0 && pkgJsons.every(p => {
    const d = path.dirname(path.join(ROOT, p.rel));
    return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].some(l => fs.existsSync(path.join(d, l)));
  }), 2, 'MEDIUM', 'A package.json has no lockfile - builds are not reproducible');

const ABANDONED = ['request', 'node-uuid', 'left-pad', 'gulp-util', 'cryptiles', 'hoek',
  'tunnel-agent', 'har-validator', 'growl', 'sha.js', 'crypto', 'querystring'];
const abandoned = ABANDONED.filter(dep);
gate('DEPS', 'no-abandoned', 'no deprecated/abandoned packages', abandoned.length === 0, 2,
  'MEDIUM', 'Deprecated dependencies: ' + abandoned.join(', '));

// ===========================================================================
// 5. HEADERS - 10 pts
// ===========================================================================

const usesHelmet = dep('helmet') || has(/helmet\s*\(/, CODE);
const HEADER_CHECKS = [
  ['Content-Security-Policy', /Content-Security-Policy|contentSecurityPolicy/i],
  ['X-Frame-Options / frame-ancestors', /X-Frame-Options|frame-ancestors|frameguard/i],
  ['X-Content-Type-Options: nosniff', /X-Content-Type-Options|noSniff/i],
  ['Strict-Transport-Security', /Strict-Transport-Security|hsts/i],
  ['Referrer-Policy', /Referrer-Policy|referrerPolicy/i]
];
let hdrOk = 0;
const hdrMissing = [];
for (const [label, re] of HEADER_CHECKS) {
  if (usesHelmet || has(re, NON_TEST)) hdrOk++;
  else hdrMissing.push(label);
}
ratio('HEADERS', 'security-headers', 'security response headers configured',
  hdrOk, HEADER_CHECKS.length, 5, 'MEDIUM',
  () => 'Missing security header(s): ' + hdrMissing.join(', '));

const corsWildcard = scan(/origin\s*:\s*['"`]\*['"`]|Access-Control-Allow-Origin['"`]?\s*[:,]\s*['"`]\*|\bcors\s*\(\s*\)/i, CODE);
const corsConfigured = dep('cors') || has(/\bcors\s*\(|Access-Control-Allow-Origin/i, CODE);
gate('HEADERS', 'cors-scoped', 'CORS restricted to known origins',
  corsConfigured && corsWildcard.length === 0, 3,
  corsWildcard.length ? 'HIGH' : 'MEDIUM',
  corsWildcard.length ? 'CORS allows any origin (*)' : 'CORS not explicitly configured',
  corsWildcard);

gate('HEADERS', 'https-enforced', 'HTTPS / secure transport enforced',
  has(/secure\s*:\s*(?:true|process\.env\.NODE_ENV)|trust\s+proxy|req\.secure|x-forwarded-proto/i, NON_TEST),
  2, 'MEDIUM', 'No HTTPS enforcement or secure-cookie flag in production config');

// ===========================================================================
// 6. CONFIG - 10 pts
// ===========================================================================

gate('CONFIG', 'gitignore-hygiene', '.gitignore covers node_modules / build / .env',
  /node_modules/.test(gitignore) && /(dist|build|\.next|out)/.test(gitignore) && envIgnored, 2,
  'LOW', '.gitignore is missing node_modules, build output or .env');

penalty('CONFIG', 'no-tls-bypass', 'TLS verification never disabled',
  scan(/NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*['"`]?0|rejectUnauthorized\s*:\s*false|strictSSL\s*:\s*false/i, NON_TEST),
  2, 2, 'CRITICAL', 'TLS certificate verification disabled');

penalty('CONFIG', 'no-error-leak', 'internal errors not returned to clients',
  scan(/res(?:\.status\(\d+\))?\.(?:json|send)\s*\(\s*\{?[^)\n]{0,60}\b(?:err(?:or)?\.stack|err(?:or)?\.message|error\s*:\s*err\b)/, CODE),
  2, 1, 'MEDIUM', 'Internal error message/stack returned in an HTTP response');

gate('CONFIG', 'body-limit', 'request body size limited',
  !has(/express\.json\s*\(|bodyParser/, CODE) || has(/limit\s*:\s*['"`]?\d+\s*(?:kb|mb)/i, CODE), 1,
  'LOW', 'No request body size limit - trivial payload DoS');

gate('CONFIG', 'env-driven-config', 'DB/service URLs read from the environment',
  !has(/DATABASE_URL|createConnection|new\s+Pool/i, files)
  || has(/process\.env\.(?:DATABASE_URL|DB_[A-Z_]+)|env\(\s*"DATABASE_URL"\s*\)/, files), 1,
  'MEDIUM', 'Database connection string not read from environment');

penalty('CONFIG', 'no-debug-left-on', 'no debug/sourcemap flag forced on',
  scan(/\bdebug\s*:\s*true|devtools\s*:\s*true|sourcemap\s*:\s*true/i,
    NON_TEST.filter(f => /vite|webpack|next|rollup|config/i.test(f.name))),
  1, 1, 'LOW', 'Debug/sourcemap flag hardcoded on in a build config');

gate('CONFIG', 'scan-automation', 'automated dependency/security scanning configured',
  exists('.github/dependabot.yml') || exists('renovate.json')
  || (exists('.github/workflows') && /audit|codeql|snyk|trivy/i.test(
    fs.readdirSync(path.join(ROOT, '.github/workflows')).map(n => n + read('.github/workflows/' + n)).join('\n')))
  || /"[^"]*audit[^"]*"\s*:/.test(read('package.json')), 1,
  'LOW', 'No CI security/dependency scanning (dependabot, renovate, audit script)');

// ===========================================================================
// scoring + output
// ===========================================================================

const CATS = ['SECRETS', 'INPUTS', 'AUTH', 'DEPS', 'HEADERS', 'CONFIG'];
const byCat = CATS.map(c => {
  const rs = results.filter(r => r.cat === c);
  return {
    cat: c,
    earned: rs.reduce((a, r) => a + r.earned, 0),
    max: rs.reduce((a, r) => a + r.max, 0)
  };
});
const total = byCat.reduce((a, c) => a + c.earned, 0);
const maxTotal = byCat.reduce((a, c) => a + c.max, 0);
const score = Math.round((total / maxTotal) * 100);

const issues = results.filter(r => r.issue)
  .sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || (b.max - b.earned) - (a.max - a.earned));

if (MODE === 'score') {
  console.log(score);
  process.exit(0);
}

if (MODE === 'json') {
  console.log(JSON.stringify({
    score, total, maxTotal,
    scannedFiles: files.length,
    auditedWorkspaces: auditedIn,
    breakdown: byCat,
    checks: results,
    issues
  }, null, 2));
  process.exit(0);
}

if (MODE === 'checks') {
  for (const r of results) {
    const state = r.earned === r.max ? 'PASS' : r.earned === 0 ? 'FAIL' : 'PARTIAL';
    console.log(state.padEnd(7) + ' ' + r.cat.padEnd(8) + ' '
      + String(r.earned).padStart(2) + '/' + String(r.max).padEnd(2) + ' '
      + r.id + ' - ' + r.label + (r.issue ? ' :: ' + r.issue : ''));
  }
  console.log('\nSCORE ' + score + '/100  ('
    + results.filter(r => r.earned === r.max).length + '/' + results.length + ' checks passing)');
  process.exit(0);
}

const bar = (e, m, w) => {
  const width = w || 20;
  const fill = m === 0 ? 0 : Math.round((e / m) * width);
  return '#'.repeat(fill) + '.'.repeat(width - fill);
};
const grade = s => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : s >= 40 ? 'E' : 'F';

console.log('=== SECURITY SKILL CHECK ===\n');
console.log('SCORE: ' + score + '/100  (grade ' + grade(score) + ')');
console.log(files.length + ' files scanned | ' + results.length + ' checks | npm audit: '
  + (auditedIn.length ? auditedIn.join(', ') : 'not run') + '\n');
console.log('BREAKDOWN:');
for (const c of byCat) {
  console.log('  ' + c.cat.padEnd(8) + ' [' + String(c.earned).padStart(2) + '/' + c.max + '] ' + bar(c.earned, c.max));
}
console.log('\nISSUES (' + issues.length + '):');
if (!issues.length) console.log('  none - every check passed');
for (const r of issues) {
  console.log('  [' + r.sev.padEnd(8) + '] -' + (r.max - r.earned) + 'pt ' + r.cat + '/' + r.id + ': ' + r.issue);
  for (const ref of r.refs.slice(0, 5)) {
    console.log('               -> ' + ref.file + ':' + ref.line + (ref.match ? '  ' + ref.match : ''));
  }
  if (r.refs.length > 5) console.log('               -> ...and ' + (r.refs.length - 5) + ' more');
}
const passing = results.filter(r => r.earned === r.max);
console.log('\nPASSING (' + passing.length + '/' + results.length + '):');
console.log('  ' + (passing.map(r => r.id).join(', ') || '-'));
