import express from 'express';
import { validateEnv } from '../server/src/config/env.js';

/** One Express app exported for @vercel/node (no wrapped handler → fewer bundler edge cases). */
let app;

try {
  validateEnv();
  const { createApp } = await import('../server/src/app.js');
  app = createApp();
} catch (err) {
  console.error('[api] bootstrap failed:', err);
  app = express();
  app.use((req, res) => {
    if (res.headersSent) return;
    res.status(503).json({
      ok: false,
      error: 'Server configuration error',
      detail: String(err?.message || err),
    });
  });
}

export default app;
