/**
 * Builds the Express application.
 *
 * Wiring order: security middleware → body parser → logging → routes →
 * 404 fallback → centralized error handler. Exported as a factory so tests
 * (and the seed script) can create isolated app instances.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './lib/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { subscribersRouter } from './routes/subscribers.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '64kb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  // All routes are mounted under /api per CONTRACT.md.
  app.use('/api', healthRouter);
  app.use('/api', productsRouter);
  app.use('/api', ordersRouter);
  app.use('/api', subscribersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
