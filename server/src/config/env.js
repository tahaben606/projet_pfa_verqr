import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/src/config -> ../../.env = server/.env ; ../../../.env = repo root
const serverEnvPath = join(__dirname, '../../.env');
const repoRootEnvPath = join(__dirname, '../../../.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: repoRootEnvPath });
dotenv.config();

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];

function validateEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missing.length === 0) return;

  const lines = [
    'Missing required environment variables: ' + missing.join(', '),
    '',
    `Add a .env file with these variables. Typical paths:`,
    `  - ${serverEnvPath}`,
    `  - ${repoRootEnvPath}`,
    'Copy server/.env.example → server/.env and fill values. Then set:',
    ...REQUIRED.map((k) => `  - ${k}`),
    '',
    'Supabase: Project Settings → API — URL, anon (public) key, and service_role key.',
  ];
  throw new Error(lines.join('\n'));
}

validateEnv();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL.trim(),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  /** Same as client `VITE_SUPABASE_ANON_KEY` — used only to validate browser access tokens via `auth.getUser`. */
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY.trim(),
  /** @deprecated Auth uses supabaseAdmin.auth.getUser(token); kept only if you add JWT-based code later */
  supabaseJwtSecret: (process.env.SUPABASE_JWT_SECRET || '').trim(),
  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  orgName: process.env.ORG_NAME || 'Official Attestation',
  orgLogoUrl: process.env.ORG_LOGO_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
