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

export const env = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  PORT: parseInteger(process.env.PORT, 4000),
  WEB_ORIGIN: readString(process.env.WEB_ORIGIN, 'http://localhost:3000'),
  MONGODB_URI: readString(
    process.env.MONGODB_URI,
    'mongodb://127.0.0.1:27017/pocketdeck',
  ),
  RATE_LIMIT_MAX: parseInteger(process.env.RATE_LIMIT_MAX, 10),
  RATE_LIMIT_WINDOW_MS: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
} as const;

export type Env = typeof env;
