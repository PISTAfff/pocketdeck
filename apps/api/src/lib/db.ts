/**
 * Mongoose connection lifecycle.
 *
 * `connect()` resolves either way: if the database is unreachable it logs a
 * warning and resolves so the orchestrator can boot the API without a local
 * Mongo. Routes that need the DB will surface a 5xx/404 as appropriate.
 */
import mongoose from 'mongoose';

import { env } from './env.js';

// Fail queries immediately when not connected instead of hanging on the
// 10s buffer, this lets the API serve a clean 404 in dev when no Mongo
// is running, instead of timing out and returning 500.
mongoose.set('bufferCommands', false);

let connected = false;

export async function connect(): Promise<boolean> {
  if (connected) return true;
  try {
    await mongoose.connect(env.MONGODB_URI, {
      // 8s (was 3s): on serverless, a cold function + an idle Atlas M0 can
      // take several seconds to establish the first connection. 3s timed
      // out before Atlas woke, so the first request after idle 404'd.
      // 8s stays comfortably inside Vercel's 10s function budget.
      serverSelectionTimeoutMS: 8000,
    });
    connected = true;
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[api] mongo connection failed (${message}). Continuing without DB.`,
    );
    return false;
  }
}

export async function disconnect(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
