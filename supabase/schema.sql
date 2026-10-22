-- ===========================================================================
-- Emerging Investors Canada — member directory schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New
-- query → paste → Run). It is written to be re-runnable: every object is
-- created with "if not exists" or "or replace", so running it a second time
-- after an edit updates the database rather than erroring.
--
-- The security model in one paragraph: every member row lives in
-- public.profiles, keyed by the Supabase auth user id. Row-level security
-- lets you always read your own row, lets APPROVED members read other
-- APPROVED rows, and lets admins read everything. Nobody can write their own
-- `status` or `is_admin` columns, because those two columns are simply never
-- granted to the `authenticated` role — approvals go through the
-- set_member_status() function instead, which checks for admin first.
-- ===========================================================================


-- --- the table -------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text        not null,
  contact_email   text        not null,
  phone           text,
  country         text        not null,
  role            text        not null,
  company         text        not null,
  fun_facts       text,
  interests       text[]      not null default '{}',
  linkedin_url    text,

  -- Set by admins only, never by the member themselves. New signups land in
  -- 'pending' and see a "we're reviewing your application" screen until an
  -- admin approves them.
  status          text        not null default 'pending',
  is_admin        boolean     not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint profiles_status_check
    check (status in ('pending', 'approved', 'declined'))
);

-- The directory filters on these three, and the sort is by name.
create index if not exists profiles_status_idx  on public.profiles (status);
create index if not exists profiles_country_idx on public.profiles (country);
create index if not exists profiles_company_idx on public.profiles (company);


-- --- updated_at ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- --- helpers ---------------------------------------------------------------
--
-- Both are SECURITY DEFINER, which matters: a policy on public.profiles that
-- itself selects from public.profiles would recurse forever under RLS. Running
-- the lookup as the function owner sidesteps the policies and breaks the loop.
-- `set search_path = public` stops a caller shadowing the table name.

create or replace function public.is_approved_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;


-- --- row-level security ----------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "read own profile"        on public.profiles;
drop policy if exists "read approved directory" on public.profiles;
drop policy if exists "admins read all"         on public.profiles;
drop policy if exists "insert own profile"      on public.profiles;
drop policy if exists "update own profile"      on public.profiles;

-- You can always see yourself — including while still pending, so the
-- "under review" screen knows who you are.
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- The directory itself: approved members see other approved members.
create policy "read approved directory" on public.profiles
  for select using (status = 'approved' and public.is_approved_member());

-- Admins see pending and declined rows too, so they have something to review.
create policy "admins read all" on public.profiles
  for select using (public.is_admin());

create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());


-- --- column privileges -----------------------------------------------------
--
-- RLS decides WHICH ROWS you may touch; these grants decide WHICH COLUMNS.
-- Without them, "update own profile" would happily let a pending member run
-- `update profiles set status = 'approved' where id = auth.uid()`.
-- `status` and `is_admin` are deliberately absent from both lists.

revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;

grant insert (
  id, full_name, contact_email, phone, country, role, company,
  fun_facts, interests, linkedin_url
) on public.profiles to authenticated;

grant update (
  full_name, contact_email, phone, country, role, company,
  fun_facts, interests, linkedin_url
) on public.profiles to authenticated;


-- --- approvals -------------------------------------------------------------
--
-- The only way `status` ever changes. SECURITY DEFINER so it can write a
-- column the caller has no grant on, with an explicit admin check as the gate.

create or replace function public.set_member_status(target uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change member status';
  end if;

  if new_status not in ('pending', 'approved', 'declined') then
    raise exception 'Invalid status: %', new_status;
  end if;

  update public.profiles
     set status = new_status
   where id = target;
end;
$$;

revoke all on function public.set_member_status(uuid, text) from public, anon;
grant execute on function public.set_member_status(uuid, text) to authenticated;


-- ===========================================================================
-- Make yourself an admin
--
-- Chicken and egg: set_member_status() requires an admin, and at the start
-- there isn't one. So the first admin is made by hand, here in the SQL editor,
-- which is the one place that bypasses RLS. Sign up through the site first so
-- the row exists, then run both statements with your own address:
--
--   update public.profiles set is_admin = true,  status = 'approved'
--    where contact_email = 'you@example.com';
--
-- Check it took:
--
--   select full_name, contact_email, status, is_admin from public.profiles;
-- ===========================================================================
