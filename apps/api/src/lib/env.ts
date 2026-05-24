/**
 * Environment variable reader/validator.
 *
 * Loads from `.env` (via dotenv) and exposes a typed `env` object. Dev gets
 * sensible defaults so the API boots without any wiring; production REFUSES
 * to boot when a security-sensitive variable is unset or matches the dev
 * default. That tradeoff lives in `assertProductionEnv()` below.
 */
import 'dotenv/config';

const DEV_ADMIN_PASSWORD = 'pocketdeck-admin';

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function readString(value: string | undefined, fallback: string): string {
  if (value === undefined || value === '') return fallback;
  return value;
}

const NODE_ENV = readString(process.env.NODE_ENV, 'development');

/**
 * Split a comma-separated origin list into the array form `cors` accepts.
 * Empty entries are dropped and trailing slashes are normalized away so
 * `https://foo.com/` and `https://foo.com` resolve identically.
 */
function parseOrigins(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined || value === '') return fallback;
  const list = value
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter((s) => s.length > 0);
  return list.length > 0 ? list : fallback;
}

const WEB_ORIGINS = parseOrigins(process.env.WEB_ORIGIN, [
  'http://localhost:3000',
]);

export const env = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  PORT: parseInteger(process.env.PORT, 4000),
  WEB_ORIGIN: WEB_ORIGINS[0]!,
  WEB_ORIGINS,
  MONGODB_URI: readString(
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/pocketdeck',
  ),
  RATE_LIMIT_MAX: parseInteger(process.env.RATE_LIMIT_MAX, 10),
  RATE_LIMIT_WINDOW_MS: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  // Shared secret for the admin dashboard. In dev we fall back to a known
  // string so the dashboard can be exercised locally without env wiring.
  // In production, `assertProductionEnv()` refuses to start if it's still
  // the dev default.
  ADMIN_PASSWORD: readString(process.env.ADMIN_PASSWORD, DEV_ADMIN_PASSWORD),
  ADMIN_TOKEN_TTL_MS: parseInteger(
    process.env.ADMIN_TOKEN_TTL_MS,
    1000 * 60 * 60 * 12, // 12h
  ),
  // Render injects this on every web service: the public https URL the
  // service is reachable at. We use it as the target for the self-ping
  // keep-warm loop. Empty/missing means we're not on Render — skip the
  // loop (no-op in local dev).
  RENDER_EXTERNAL_URL: readString(process.env.RENDER_EXTERNAL_URL, ''),
} as const;

export type Env = typeof env;

/**
 * Fail-loud env validation for production. Called once at boot from
 * `index.ts` before the HTTP server starts. Throws on any condition that
 * would either reduce security (default admin password) or leave the API
 * unable to do useful work (no Mongo URI configured). Dev/test environments
 * are unaffected.
 */
export function assertProductionEnv(): void {
  if (!env.isProduction) return;
  const fatal: string[] = [];

  if (env.ADMIN_PASSWORD === DEV_ADMIN_PASSWORD) {
    fatal.push(
      'ADMIN_PASSWORD is unset (or still the dev default). Refusing to boot in production.',
    );
  }
  if (env.ADMIN_PASSWORD.length < 12) {
    fatal.push(
      `ADMIN_PASSWORD is too short (${env.ADMIN_PASSWORD.length} chars). Require at least 12.`,
    );
  }
  if (!process.env.MONGODB_URI) {
    fatal.push(
      'MONGODB_URI is unset. Production deployments must configure a real database.',
    );
  }
  if (env.WEB_ORIGINS.length === 0) {
    fatal.push('WEB_ORIGIN is unset. CORS would block every request.');
  }

  if (fatal.length > 0) {
    for (const msg of fatal) process.stderr.write(`[env] FATAL: ${msg}\n`);
    throw new Error('Production environment misconfigured — see logs above.');
  }
}
