import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { env } from './config/env.js';

import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'connect-src': ["'self'", 'https://yvciqpseizgmjekstagb.supabase.co'],
          'img-src': ["'self'", 'data:', 'https://yvciqpseizgmjekstagb.supabase.co'],
          'script-src': ["'self'", "'unsafe-inline'"], // Needed for some Vite/React setups
        },
      },
    })
  );
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use('/api', apiRouter);

  // Serve static files from the React app
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const publicPath = join(__dirname, '../../client/dist');
  
  app.use(express.static(publicPath));

  // Fallback to index.html for React Router
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(publicPath, 'index.html'));
  });

  app.use(errorHandler);
  return app;
}


