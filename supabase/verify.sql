-- ===========================================================================
-- Verification for the member directory. Safe to run any time; it only reads.
--
-- Paste into the Supabase SQL editor and run. Every row must say PASS.
--
-- A note on reading privilege tables: `information_schema.column_privileges`
-- lists one row per column PER PRIVILEGE TYPE. Signed-in members are granted
-- table-wide SELECT — the app has to read your own `status` to know whether
-- you are approved — so `status` and `is_admin` legitimately appear there with
-- privilege_type = 'SELECT'. Seeing them is normal. What must never appear is
-- INSERT or UPDATE on those two columns, which is what check 4 tests.
-- ===========================================================================

with checks as (

  select 1 as ord,
         'RLS enabled on profiles' as what,
         (select count(*) from pg_tables
           where schemaname = 'public' and tablename = 'profiles'
             and rowsecurity)::int as got,
         1 as want

  union all select 2,
         'Row-level security policies present',
         (select count(*) from pg_policies
           where schemaname = 'public' and tablename = 'profiles')::int,
         5

  union all select 3,
         'Helper and approval functions exist',
         (select count(*) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('is_admin', 'is_approved_member', 'set_member_status'))::int,
         3

  -- The one that matters: members must not be able to approve themselves.
  union all select 4,
         'Members CANNOT write status or is_admin',
         (select count(*) from information_schema.column_privileges
           where table_schema = 'public' and table_name = 'profiles'
             and grantee = 'authenticated'
             and column_name in ('status', 'is_admin')
             and privilege_type in ('INSERT', 'UPDATE'))::int,
         0

  union all select 5,
         'Logged-out visitors have no table access',
         (select count(*) from information_schema.table_privileges
           where table_schema = 'public' and table_name = 'profiles'
             and grantee = 'anon')::int,
         0

  union all select 6,
         'Logged-out visitors cannot run the approval function',
         (select count(*) from information_schema.routine_privileges
           where routine_schema = 'public' and routine_name = 'set_member_status'
             and grantee IN ('anon', 'PUBLIC'))::int,
         0
)
select what, got, want,
       case when got = want then 'PASS' else '*** FAIL ***' end as result
  from checks
 order by ord;


-- ---------------------------------------------------------------------------
-- Supporting detail: exactly what a signed-in member may do to each column.
-- Expect SELECT only against status and is_admin, and SELECT plus INSERT and
-- UPDATE against the fields people fill in themselves.
-- ---------------------------------------------------------------------------

select column_name,
       string_agg(privilege_type, ', ' order by privilege_type) as member_can
  from information_schema.column_privileges
 where table_schema = 'public'
   and table_name   = 'profiles'
   and grantee      = 'authenticated'
 group by column_name
 order by (column_name in ('status', 'is_admin')) desc, column_name;
