-- Smart Attestation Management System — initial schema
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists "pgcrypto";

-- Roles aligned with product requirements
create type public.app_role as enum (
  'administrator',
  'administrative_agent',
  'beneficiary',
  'external_verifier'
);

create type public.request_status as enum (
  'pending',
  'approved',
  'rejected',
  'on_hold'
);

create type public.attestation_status as enum (
  'active',
  'revoked',
  'expired'
);

-- App profile linked to auth.users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'beneficiary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users (id) on delete set null,
  name text not null,
  email text,
  phone text,
  department text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attestation_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  dynamic_fields jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  parent_version_id uuid references public.attestation_types (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.attestation_requests (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.beneficiaries (id) on delete restrict,
  attestation_type_id uuid not null references public.attestation_types (id) on delete restrict,
  submitted_by uuid references public.users (id) on delete set null,
  status public.request_status not null default 'pending',
  rejection_reason text,
  comments text,
  form_payload jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attestations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.attestation_requests (id) on delete restrict,
  unique_identifier text not null unique,
  qr_token text not null unique,
  pdf_storage_path text,
  status public.attestation_status not null default 'active',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  issued_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_beneficiaries_created_by on public.beneficiaries (created_by);
create index idx_beneficiaries_name on public.beneficiaries (name);
create index idx_attestation_requests_status on public.attestation_requests (status);
create index idx_attestation_requests_submitted_by on public.attestation_requests (submitted_by);
create index idx_attestations_qr_token on public.attestations (qr_token);
create index idx_attestations_status on public.attestations (status);
create index idx_audit_logs_user_id on public.audit_logs (user_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on public.users
for each row execute procedure public.set_updated_at();

create trigger beneficiaries_updated_at before update on public.beneficiaries
for each row execute procedure public.set_updated_at();

create trigger attestation_requests_updated_at before update on public.attestation_requests
for each row execute procedure public.set_updated_at();

create trigger attestations_updated_at before update on public.attestations
for each row execute procedure public.set_updated_at();

-- New auth user → public.users row (role from metadata only if safe; default beneficiary)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    'beneficiary'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS: defense in depth when using Supabase client with user JWT.
-- Server-side Express uses service_role and bypasses RLS.

alter table public.users enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.attestation_types enable row level security;
alter table public.attestation_requests enable row level security;
alter table public.attestations enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read/update their own row
create policy "users_select_own" on public.users
for select using (auth.uid() = id);

create policy "users_update_own" on public.users
for update using (auth.uid() = id);

-- Create Storage bucket "attestations" (private) in Supabase Dashboard → Storage, or:
-- insert into storage.buckets (id, name, public) values ('attestations', 'attestations', false);
-- Backend uses service_role for uploads; use signed URLs from API for downloads.

comment on table public.users is 'Application profile; 1:1 with auth.users';
comment on table public.attestations is 'Issued document metadata; PDF in Storage';
