import { validateEnv, env } from './config/env.js';

validateEnv();
const { createApp } = await import('./app.js');
const app = createApp();
app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
