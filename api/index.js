import { validateEnv } from '../server/src/config/env.js';

let appPromise;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      try {
        validateEnv();
        const { createApp } = await import('../server/src/app.js');
        return createApp();
      } catch (err) {
        console.error('[api] failed to load Express app:', err);
        return function configurationErrorHandler(req, res) {
          if (res.headersSent) return;
          res.status(503).json({
            ok: false,
            error: 'Server configuration error',
            detail: String(err?.message || err),
          });
        };
      }
    })();
  }
  return appPromise;
}

export default function handler(req, res) {
  getApp()
    .then((app) => app(req, res))
    .catch((err) => {
      if (!res.headersSent) {
        res.status(503).json({
          ok: false,
          error: 'Server error',
          detail: String(err?.message || err),
        });
      }
    });
}
