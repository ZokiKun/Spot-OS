-- Reviews → Month → Time spent: each person splits their own month across projects, to 100%.
-- One row per person, month and project (project_id null = other work outside projects).
-- Everyone in the workspace can read every split; each editor writes only their own.

create table if not exists public.time_splits (
  id          uuid primary key default gen_random_uuid(),
  month       date not null,                 -- first day of the month
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  percent     integer not null check (percent between 1 and 100),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists time_splits_month_idx on public.time_splits (month);

drop trigger if exists time_splits_touch on public.time_splits;
create trigger time_splits_touch before update on public.time_splits for each row execute function public.touch_updated_at();

alter table public.time_splits enable row level security;
drop policy if exists "members read" on public.time_splits;
drop policy if exists "own insert" on public.time_splits;
drop policy if exists "own update" on public.time_splits;
drop policy if exists "own delete" on public.time_splits;
create policy "members read" on public.time_splits for select to authenticated using (public.is_member());
create policy "own insert" on public.time_splits for insert to authenticated with check (public.can_edit() and profile_id = auth.uid());
create policy "own update" on public.time_splits for update to authenticated using (public.can_edit() and profile_id = auth.uid()) with check (public.can_edit() and profile_id = auth.uid());
create policy "own delete" on public.time_splits for delete to authenticated using (public.can_edit() and profile_id = auth.uid());
grant select, insert, update, delete on public.time_splits to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.time_splits;
exception when duplicate_object then null;
end $$;
