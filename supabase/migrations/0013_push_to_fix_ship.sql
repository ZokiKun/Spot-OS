-- Spot OS 0013 — "Push to fix" → "Ship it".
-- The cloud run no longer pushes main: it pushes its own claude/… branch and reports the branch
-- here. The run then waits as 'ready' until an editor presses Ship it in Settings, which merges the
-- branch into main (Vercel deploys) and moves the shipped tasks to Review.
-- Needs 0012. Safe to run more than once.

alter table public.fix_runs add column if not exists branch      text;
alter table public.fix_runs add column if not exists shipped_at  timestamptz;
alter table public.fix_runs add column if not exists shipped_by  uuid references public.profiles (id) on delete set null;
alter table public.fix_runs add column if not exists ship_commit text;

alter table public.fix_runs drop constraint if exists fix_runs_status_check;
alter table public.fix_runs add constraint fix_runs_status_check
  check (status in ('running', 'ready', 'done', 'failed'));

-- Same as 0012 plus p_branch. With a branch and something shipped, the run becomes 'ready' and
-- tasks stay put until Ship it; without a branch it behaves as before (tasks → Review now).
drop function if exists public.finish_fix_run(uuid, text, text, text, jsonb);
create or replace function public.finish_fix_run(p_run_id uuid, p_token text, p_status text, p_summary text, p_results jsonb, p_branch text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  r          public.fix_runs;
  v_results  jsonb := case when jsonb_typeof(p_results) = 'array' then p_results else '[]' end;
  v_shipped  boolean := exists (select 1 from jsonb_array_elements(v_results) x where x->>'outcome' = 'shipped');
  v_branch   text := nullif(trim(coalesce(p_branch, '')), '');
  v_item     jsonb;
  v_task     uuid;
begin
  select * into r from public.fix_runs where id = p_run_id for update;
  if r.id is null or r.token_hash <> encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') then
    raise exception 'Unknown run or wrong token';
  end if;
  if r.status <> 'running' then raise exception 'This run already finished'; end if;
  if p_status not in ('done', 'failed') then raise exception 'p_status must be done or failed'; end if;
  if v_branch is not null and v_branch !~ '^claude/[A-Za-z0-9._/-]+$' then raise exception 'p_branch must be a claude/ branch'; end if;

  if p_status = 'done' and v_branch is not null and v_shipped then
    update public.fix_runs
       set status = 'ready', branch = v_branch, summary = left(p_summary, 4000), results = v_results, finished_at = now()
     where id = r.id;
    return 'ok';
  end if;

  if r.agent_id is not null then
    perform set_config('request.jwt.claim.sub', r.agent_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', r.agent_id, 'role', 'authenticated')::text, true);
  end if;
  if p_status = 'done' then
    for v_item in select * from jsonb_array_elements(v_results) loop
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
  end if;

  update public.fix_runs
     set status = p_status, branch = v_branch, summary = left(p_summary, 4000), results = v_results, finished_at = now()
   where id = r.id;
  return 'ok';
end $$;

revoke all on function public.finish_fix_run(uuid, text, text, text, jsonb, text) from public;
grant execute on function public.finish_fix_run(uuid, text, text, text, jsonb, text) to anon, authenticated;
