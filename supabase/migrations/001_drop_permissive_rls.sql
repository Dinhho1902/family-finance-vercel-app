-- ============================================================
-- SECURITY REMEDIATION — run once in the Supabase SQL Editor
-- ============================================================
-- The previous schema created `for all using(true) with check(true)` policies
-- on every table. Because the public anon key is shipped in the client JS
-- bundle, that allowed ANY unauthenticated user to read/write/delete the
-- entire database directly via the Supabase REST API, bypassing the app login.
--
-- This drops those policies. RLS stays ENABLED, and with no policy present the
-- anon/authenticated roles get zero access. The server-side service-role key
-- (used by the Next.js API routes) bypasses RLS, so the app keeps working.
-- ============================================================

drop policy if exists "allow_all_funds"         on funds;
drop policy if exists "allow_all_investments"   on investments;
drop policy if exists "allow_all_savings"       on savings;
drop policy if exists "allow_all_gold"          on gold;
drop policy if exists "allow_all_transactions"  on transactions;
drop policy if exists "allow_all_history"       on history;
drop policy if exists "allow_all_allocations"   on allocations;
drop policy if exists "allow_all_app_settings"  on app_settings;

-- Belt-and-suspenders: ensure RLS is on (the schema already enables it).
alter table funds         enable row level security;
alter table investments   enable row level security;
alter table savings       enable row level security;
alter table gold          enable row level security;
alter table transactions  enable row level security;
alter table history       enable row level security;
alter table allocations   enable row level security;
alter table app_settings  enable row level security;

-- Verify afterwards (should return 0 rows):
--   select tablename, policyname from pg_policies where schemaname = 'public';
