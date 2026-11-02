-- Spot OS 0011 — studio review: monthly report, commitments, goals and domains.
-- Safe to run more than once. (Numbered 0011 for the review work; it doesn't depend on 0012–0014.)
--
-- Reviews → Month: per month, the money (revenue collected, burn — typed in), Claude's written report
-- of what each person did, and the month's commitments (ticked done, or not done + why).
-- Reviews → Goals: 3–4 quarter goals as a tick list; under each month, that month's commitments
-- (monthly goals and commitments are the same list).

-- ─── Domains: the list lives in settings (key 'domains'); projects and tasks hold a domain id ───
-- tasks.domain overrides the project's domain for that one task (null = inherit).
alter table public.projects add column if not exists domain text;
alter table public.tasks add column if not exists domain text;

-- ─── Month review: money + Claude's report (one reviews row per month, as before) ───
alter table public.reviews add column if not exists revenue numeric;
alter table public.reviews add column if not exists burn numeric;
alter table public.reviews add column if not exists report_md text;
alter table public.reviews add column if not exists report_generated_at timestamptz;
alter table public.reviews add column if not exists report_generated_by uuid references public.profiles (id) on delete set null;

-- ─── Commitments: written at the start of a month, ticked at the end ───
create table if not exists public.commitments (
  id          uuid primary key default gen_random_uuid(),
  month       date not null,                 -- first day of the month
  title       text not null default '',
  owner_id    uuid references public.profiles (id) on delete set null,
  scope       text not null default 'studio' check (scope in ('studio', 'personal')),
  status      text check (status in ('done', 'not_done')),   -- null = not reviewed yet
  why         text,                          -- why it wasn't done
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists commitments_month_idx on public.commitments (month);

-- ─── Goals: quarter goals (period kept so monthly goals could live here later; today they're commitments) ───
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  period        text not null default 'quarter' check (period in ('month', 'quarter')),
  period_start  date not null,               -- first day of the month / quarter
  title         text not null default '',
  owner_id      uuid references public.profiles (id) on delete set null,
  domain        text,
  status        text not null default 'open' check (status in ('open', 'done', 'missed')),
  note          text,                        -- why it was missed
  sort_order    integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists goals_period_idx on public.goals (period_start);

-- ─── Triggers, RLS (members read, editors write), grants, realtime ───
do $$
declare t text;
begin
  foreach t in array array['commitments', 'goals'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
