-- Run with `supabase db push` (or paste into the Supabase SQL editor) before
-- deploying the client. This is the source of truth for tenant authorization.
create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9-]+$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

create or replace function public.is_tenant_admin(check_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_memberships
    where tenant_id = check_tenant_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('super_admin', 'admin')
  );
$$;

create policy "members read their tenant" on public.tenants
for select to authenticated
using (exists (
  select 1 from public.tenant_memberships m
  where m.tenant_id = tenants.id and m.user_id = auth.uid()
));

create policy "users read their own memberships" on public.tenant_memberships
for select to authenticated
using (user_id = auth.uid() or public.is_tenant_admin(tenant_id));

-- A verified Supabase invitation creates a session. Only that user can turn
-- their own pending membership active; clients cannot choose a role or tenant.
create or replace function public.accept_my_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare activated_count integer;
begin
  update public.tenant_memberships
  set status = 'active'
  where user_id = auth.uid() and status = 'pending';
  get diagnostics activated_count = row_count;
  return activated_count;
end;
$$;

revoke all on function public.is_tenant_admin(uuid) from public;
grant execute on function public.is_tenant_admin(uuid) to authenticated;
revoke all on function public.accept_my_invitations() from public;
grant execute on function public.accept_my_invitations() to authenticated;

-- Bootstrap the first workspace administrator after creating a user in
-- Supabase Auth. Replace the values before executing:
-- insert into public.tenants (name, slug) values ('Example Studio', 'example-studio') returning id;
-- insert into public.tenant_memberships (tenant_id, user_id, role, status)
-- values ('<tenant uuid>', '<auth user uuid>', 'super_admin', 'active');
