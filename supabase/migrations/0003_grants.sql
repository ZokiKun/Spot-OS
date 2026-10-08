-- Spot OS 0003 — table privileges for signed-in users.
-- Newer Supabase projects no longer grant the API roles access to tables created by SQL,
-- which surfaces as "permission denied for table …". RLS (0001/0002) still decides which
-- rows a member can touch; these grants only let the `authenticated` role reach the tables.
-- `anon` gets nothing: every Spot OS screen requires sign-in.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Tables, sequences and functions added by later migrations get the same access.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
