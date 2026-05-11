-- Update beneficiaries table to include specific fields for attestations

ALTER TABLE public.beneficiaries
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS internal_code text,
ADD COLUMN IF NOT EXISTS structure text,
ADD COLUMN IF NOT EXISTS service_branch text;
