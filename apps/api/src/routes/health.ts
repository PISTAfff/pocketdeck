/**
 * GET /api/health
 *
 * Returns the documented health envelope. Always 200, used by orchestrators
 * to confirm the API process is alive.
 */
import { Router } from 'express';
import type {
  ApiSuccessResponse,
  HealthResponse,
} from '@pocketdeck/types';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const payload: ApiSuccessResponse<HealthResponse> = {
    data: {
      status: 'ok',
      service: 'pocketdeck-api',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(payload);
});
