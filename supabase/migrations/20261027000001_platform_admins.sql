-- Moves every existing tenant super_admin to the global platform_admin role.
-- Run this once in the Supabase SQL editor after the first migration.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.platform_admins (user_id)
select distinct user_id from public.tenant_memberships where role = 'super_admin'
on conflict (user_id) do nothing;

update public.tenant_memberships set role = 'admin' where role = 'super_admin';
alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships add constraint tenant_memberships_role_check check (role in ('admin', 'user'));

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

drop policy if exists "platform admins read themselves" on public.platform_admins;
create policy "platform admins read themselves" on public.platform_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "members read their tenant" on public.tenants;
create policy "members read their tenant" on public.tenants
for select to authenticated using (
  public.is_platform_admin() or exists (
    select 1 from public.tenant_memberships m where m.tenant_id = tenants.id and m.user_id = auth.uid()
  )
);

drop policy if exists "users read their own memberships" on public.tenant_memberships;
create policy "users read their own memberships" on public.tenant_memberships
for select to authenticated using (
  public.is_platform_admin() or user_id = auth.uid() or public.is_tenant_admin(tenant_id)
);

create or replace function public.is_tenant_admin(check_tenant_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.tenant_memberships
    where tenant_id = check_tenant_id and user_id = auth.uid()
      and status = 'active' and role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
