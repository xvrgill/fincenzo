-- Enable Row-Level Security on every table in the public schema.
--
-- Context: this app accesses the database via Drizzle over a direct Postgres
-- connection (DATABASE_URL), which uses a role with BYPASSRLS. Supabase is
-- used only for auth. However, PostgREST still exposes every public table via
-- the REST API using the anon/publishable key that ships to the browser
-- (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), so without RLS anyone can read or
-- mutate rows directly. Enabling RLS with no policies denies all PostgREST
-- access by default while Drizzle continues to work (its role bypasses RLS).
--
-- Do NOT use FORCE ROW LEVEL SECURITY — that would also apply RLS to the
-- table owner and break Drizzle.
--
-- Re-run safely; ENABLE is idempotent.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
