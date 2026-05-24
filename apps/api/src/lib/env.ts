/**
 * Environment variable reader/validator.
 *
 * Loads from `.env` (via dotenv) and exposes a typed `env` object. We use
 * sensible defaults so the API can boot without a `.env` file in dev.
 */
import 'dotenv/config';

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
  // Shared secret for the admin dashboard. In a real deployment this
  // would come from a secrets manager; here we accept a dev default so
  // the dashboard can be exercised locally without env wiring.
  ADMIN_PASSWORD: readString(process.env.ADMIN_PASSWORD, 'pocketdeck-admin'),
  ADMIN_TOKEN_TTL_MS: parseInteger(
    process.env.ADMIN_TOKEN_TTL_MS,
    1000 * 60 * 60 * 12, // 12h
  ),
} as const;

export type Env = typeof env;
