# Smart Attestation Management System with QR Code Verification (VerQR)

Full-stack application for institutions to manage attestation requests, generate PDF documents with QR codes, archive files in Supabase Storage, and offer a **public verification** page that exposes only minimal metadata (no personal data).

## Architecture

| Layer | Stack |
|--------|--------|
| Frontend | React (Vite), React Router, Axios, Tailwind, react-hook-form + Zod, Recharts, react-hot-toast, Lucide |
| Backend | Node.js, Express, JWT verification (Supabase access token), modular routes/controllers/services |
| Data | Supabase PostgreSQL, Supabase Auth, Supabase Storage (bucket `attestations`) |

The API uses the **service role** key server-side only. The browser never receives the service role key.

## Repository layout

- `client/` — React SPA (deploy to **Vercel**).
- `server/` — Express REST API (deploy to **Render** / **Railway**).
- `supabase/migrations/` — SQL schema, triggers, and RLS for `public.users`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260511000000_initial_schema.sql` in the SQL Editor (or via Supabase CLI).
3. **Storage**: create a private bucket named **`attestations`** (Dashboard → Storage).
4. Copy **Project URL**, **anon key**, **service role key**, and **JWT Secret** (Settings → API).

### First administrator

New sign-ups get role `beneficiary` (see trigger). Promote your user in SQL:

```sql
update public.users
set role = 'administrator'
where email = 'you@example.com';
```

## Local development

### Server

```bash
cd server
cp .env.example .env
# fill SUPABASE_* and PUBLIC_APP_URL=http://localhost:5173
npm install
npm run dev
```

API listens on `http://localhost:4000`. Health: `GET /api/health`.

### Client

```bash
cd client
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:4000` (see `client/vite.config.js`).

## Roles

| Role | Capabilities (high level) |
|------|---------------------------|
| `administrator` | Full access; delete attestation types; change user roles via API |
| `administrative_agent` | Beneficiaries, templates, requests workflow, PDF issuance, archive, audit |
| `beneficiary` | Own requests; shared read-only beneficiary directory for submitting requests |
| `external_verifier` | Archive read + download signed URLs; verification uses public page |

## Public verification

- QR encodes: `{PUBLIC_APP_URL}/verify/{qr_token}`.
- Browser calls `GET /api/public/verify/:token` (no auth).
- Response states: `valid`, `revoked`, `expired`, `not_found` — **no PII**.

## Deployment notes

- **Vercel (client)**: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and **`VITE_API_URL`** to your API base **including `/api`** (example: `https://verqr-api.onrender.com/api`) so the SPA and the public `/verify/:token` page can reach `GET …/public/verify/:token`.
- **Render/Railway (server)**: set the same env vars as `server/.env.example`; set `CORS_ORIGIN` to your Vercel domain; set `PUBLIC_APP_URL` to the Vercel site URL so QR codes resolve correctly.

## Security checklist

- Passwords: handled by **Supabase Auth** (hashed server-side by Supabase).
- API: **Bearer Supabase JWT** verified with `SUPABASE_JWT_SECRET`.
- Input validation: `express-validator` on routes.
- SQL: parameterized queries via Supabase client (no raw string SQL in app code).
- PDFs: private bucket; downloads via **short-lived signed URLs** from the API.

## Scripts

| Directory | Command | Purpose |
|-----------|---------|---------|
| `client/` | `npm run dev` | Vite dev server |
| `client/` | `npm run build` | Production bundle |
| `server/` | `npm run dev` | Express with `--watch` |
| `server/` | `npm start` | Production server |
