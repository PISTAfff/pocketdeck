/**
 * Admin authentication middleware.
 *
 * A shared password trades for a short-lived signed token. The token is
 * an opaque value tied to a server-side issuance time (so we can expire
 * it). Production deployments would swap this for JWT + per-user
 * accounts; for the storefront demo a single shared admin is enough.
 *
 * Why not JWT here:
 *   - we don't need claims beyond "is admin"
 *   - one secret to rotate, no key management
 *   - constant-time comparison keeps password checks safe
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../lib/env.js';
import { ApiError } from '../lib/errors.js';

const SIGNING_SECRET = randomBytes(32);

/**
 * Build an opaque admin token: `${issuedAtMs}.${hmac(issuedAtMs)}`.
 * Validation re-derives the hmac and compares in constant time.
 */
export function issueAdminToken(): string {
  const issuedAt = Date.now();
  const sig = createHmac('sha256', SIGNING_SECRET)
    .update(String(issuedAt))
    .digest('hex');
  return `${issuedAt}.${sig}`;
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [issuedRaw, providedSig] = parts as [string, string];
  const issuedAt = Number.parseInt(issuedRaw, 10);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > env.ADMIN_TOKEN_TTL_MS) return false;
  const expectedSig = createHmac('sha256', SIGNING_SECRET)
    .update(String(issuedAt))
    .digest('hex');
  try {
    const a = Buffer.from(expectedSig, 'hex');
    const b = Buffer.from(providedSig, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Constant-time password equality. Falls back to a non-equal compare
 * when lengths differ (still constant on the prefix) to avoid leaking
 * the length difference.
 */
export function passwordsMatch(provided: string): boolean {
  const expected = Buffer.from(env.ADMIN_PASSWORD, 'utf8');
  const given = Buffer.from(provided, 'utf8');
  // Pad both to same length so timingSafeEqual can run; then check
  // length equality at the end. The padding bytes don't affect the
  // final length-equality check.
  const max = Math.max(expected.length, given.length, 1);
  const padded = (b: Buffer) => Buffer.concat([b, Buffer.alloc(max - b.length)]);
  const ok = timingSafeEqual(padded(expected), padded(given));
  return ok && expected.length === given.length;
}

/** Express middleware: require a valid admin token in the Authorization header. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!isValidAdminToken(token)) {
    return next(ApiError.unauthorized('Admin authentication required.'));
  }
  next();
}
