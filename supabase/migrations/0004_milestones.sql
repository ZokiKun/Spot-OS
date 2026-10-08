-- Spot OS 0004 — project timelines.
-- A project's timeline is an ordered list of milestones; every task can sit under one.
-- The project's "next step" is derived in the app: the first milestone whose tasks
-- aren't all done. projects.next_action is no longer edited (kept for old activity).

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  due_date    date,
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists milestones_project_idx on public.milestones (project_id, sort_order);

drop trigger if exists milestones_touch on public.milestones;
create trigger milestones_touch before update on public.milestones
  for each row execute function public.touch_updated_at();

alter table public.milestones enable row level security;
drop policy if exists "members full access" on public.milestones;
create policy "members full access" on public.milestones for all to authenticated
  using (public.is_member()) with check (public.is_member());

grant select, insert, update, delete on public.milestones to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.milestones;
exception when duplicate_object then null;
end $$;

-- Tasks belong to a milestone (optional; deleting a milestone keeps its tasks).
alter table public.tasks add column if not exists milestone_id uuid references public.milestones (id) on delete set null;
create index if not exists tasks_milestone_idx on public.tasks (milestone_id);
