/**
 * API entry point — Phase 1 minimal skeleton.
 *
 * Phase 2A will replace this with the real wired-up Express app:
 *   - models, routes, Joi schemas
 *   - Mongo connection
 *   - rate limiting, CORS, helmet
 *
 * This file deliberately runs without a Mongo connection so the skeleton
 * can be started by Phase 1 verification without external services.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import type { HealthResponse, ApiSuccessResponse } from '@pocketdeck/types';

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

const app = express();
const startTime = Date.now();

app.use(cors({ origin: WEB_ORIGIN, credentials: false }));
app.use(express.json({ limit: '64kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => {
  const payload: ApiSuccessResponse<HealthResponse> = {
    data: {
      status: 'ok',
      service: 'pocketdeck-api',
      uptimeSeconds: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(payload);
});

// Fallback 404 in the contract envelope. Phase 2A will replace with a real handler.
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Endpoint not found.' },
  });
});

app.listen(PORT, () => {
  // Keep the startup line — Phase 2A may add structured logging later.
  process.stdout.write(`[api] listening on http://localhost:${PORT}\n`);
});
