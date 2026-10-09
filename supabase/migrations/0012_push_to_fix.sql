-- Spot OS 0012 — "Push to fix" (Settings → Automation).
-- An editor presses the button; the app sends every open task assigned to the Claude member to a
-- cloud Claude Code routine, which builds them, pushes main (Vercel deploys) and reports back here
-- through finish_fix_run(). Each run gets a one-time token; only its sha256 is stored.
-- Safe to run more than once.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.fix_runs (
  id            uuid primary key default gen_random_uuid(),
  requested_by  uuid references public.profiles (id) on delete set null,
  agent_id      uuid references public.profiles (id) on delete set null,
  task_ids      uuid[] not null default '{}',
  status        text not null default 'running' check (status in ('running', 'done', 'failed')),
  session_url   text,
  summary       text,
  -- [{ task_id, outcome: 'shipped' | 'skipped', note, commit }]
  results       jsonb not null default '[]',
  error         text,
  token_hash    text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists fix_runs_created_idx on public.fix_runs (created_at desc);

drop trigger if exists fix_runs_touch on public.fix_runs;
create trigger fix_runs_touch before update on public.fix_runs
  for each row execute function public.touch_updated_at();

alter table public.fix_runs enable row level security;
drop policy if exists "members read" on public.fix_runs;
drop policy if exists "editors insert" on public.fix_runs;
drop policy if exists "editors update" on public.fix_runs;
create policy "members read" on public.fix_runs for select to authenticated using (public.is_member());
create policy "editors insert" on public.fix_runs for insert to authenticated with check (public.can_edit());
create policy "editors update" on public.fix_runs for update to authenticated using (public.can_edit()) with check (public.can_edit());
grant select, insert, update on public.fix_runs to authenticated;

-- ─── The cloud run reports back (it only has the public anon key + its run token) ───
-- Shipped tasks move to Review (a person checks them live and marks them done), as the Claude
-- member so the activity feed reads "Claude:zoki …".
create or replace function public.finish_fix_run(p_run_id uuid, p_token text, p_status text, p_summary text, p_results jsonb)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  r       public.fix_runs;
  v_item  jsonb;
  v_task  uuid;
begin
  select * into r from public.fix_runs where id = p_run_id for update;
  if r.id is null or r.token_hash <> encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') then
    raise exception 'Unknown run or wrong token';
  end if;
  if r.status <> 'running' then raise exception 'This run already finished'; end if;
  if p_status not in ('done', 'failed') then raise exception 'p_status must be done or failed'; end if;

  if r.agent_id is not null then
    perform set_config('request.jwt.claim.sub', r.agent_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', r.agent_id, 'role', 'authenticated')::text, true);
  end if;

  for v_item in select * from jsonb_array_elements(case when jsonb_typeof(p_results) = 'array' then p_results else '[]' end) loop
    if v_item->>'outcome' = 'shipped' then
      begin
        v_task := (v_item->>'task_id')::uuid;
      exception when others then
        continue;
      end;
      if v_task = any (r.task_ids) then
        update public.tasks set status = 'review', custom_status = null, completed_at = null
          where id = v_task and status <> 'done';
      end if;
    end if;
  end loop;

  update public.fix_runs
     set status = p_status,
         summary = left(p_summary, 4000),
         results = case when jsonb_typeof(p_results) = 'array' then p_results else '[]' end,
         finished_at = now()
   where id = r.id;
  return 'ok';
end $$;

revoke all on function public.finish_fix_run(uuid, text, text, text, jsonb) from public;
grant usage on schema public to anon;
grant execute on function public.finish_fix_run(uuid, text, text, text, jsonb) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.fix_runs;
exception when duplicate_object then null;
end $$;
