-- Spot OS — initial schema
-- One shared Studio Spot workspace, individual accounts, RLS on every table.
-- Run with `supabase db push` or paste into the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  role_title  text,
  color       text not null default 'blue',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Membership = having a profile. Sign-ups are disabled; members are invited.
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  icon                  text,
  type                  text not null default 'client' check (type in ('client', 'in_house', 'studio', 'personal')),
  status                text not null default 'active' check (status in ('backlog', 'active', 'blocked', 'review', 'completed', 'archived')),
  client                text,
  client_contact        text,
  creative_director_id  uuid references public.profiles (id) on delete set null,
  lead_id               uuid references public.profiles (id) on delete set null,
  start_date            date,
  deadline              date,
  description           text,
  next_action           text,
  notes_html            text,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz
);
create index projects_status_idx on public.projects (status);

create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, profile_id)
);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects (id) on delete cascade,
  title         text not null,
  description   text,
  assignee_id   uuid references public.profiles (id) on delete set null,
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'review', 'done')),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date      date,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_assignee_idx on public.tasks (assignee_id) where status <> 'done';
create index tasks_due_idx on public.tasks (due_date) where status <> 'done';

create table public.calendar_notes (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  title         text not null default '',
  content_html  text not null default '',
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index calendar_notes_date_idx on public.calendar_notes (date);

create table public.library_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default 'url' check (type in ('google_doc', 'google_sheet', 'google_slides', 'drive_folder', 'drive_file', 'pdf', 'template', 'url')),
  url          text not null,
  project_id   uuid references public.projects (id) on delete set null,
  tags         text[] not null default '{}',
  description  text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index library_items_project_idx on public.library_items (project_id);

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  period        text not null check (period in ('month', 'quarter')),
  period_start  date not null,
  planned       text not null default '',
  done          text not null default '',
  not_done      text not null default '',
  reasons       text not null default '',
  wins          text not null default '',
  problems      text not null default '',
  lessons       text not null default '',
  next_period   text not null default '',
  numbers       text not null default '',
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (period, period_start)
);

-- Native uploads (Supabase Storage). Exactly one owner.
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid references public.calendar_notes (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete cascade,
  review_id     uuid references public.reviews (id) on delete cascade,
  name          text not null,
  mime_type     text not null,
  size          bigint not null,
  storage_path  text not null,
  url           text not null,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (num_nonnulls(note_id, project_id, review_id) = 1)
);
create index attachments_note_idx on public.attachments (note_id);
create index attachments_project_idx on public.attachments (project_id);

create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles (id) on delete set null,
  action        text not null,
  entity_type   text not null check (entity_type in ('project', 'task', 'calendar_note', 'library_item', 'review', 'kb_page')),
  entity_id     uuid not null,
  entity_label  text not null default '',
  project_id    uuid references public.projects (id) on delete cascade,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_project_idx on public.activity_log (project_id);

create table public.kb_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  icon        text,
  content_md  text not null default '',
  sort_order  integer not null default 0,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.finance_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  kind            text not null default 'google_sheet_csv' check (kind in ('google_sheet_csv', 'demo')),
  url             text,
  mapping         jsonb not null default '{}',
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.finance_snapshots (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.finance_sources (id) on delete cascade,
  entries     jsonb not null default '[]',
  balance     numeric,
  fetched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index finance_snapshots_source_idx on public.finance_snapshots (source_id, fetched_at desc);

create table public.settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at on every table
do $$
declare t text;
begin
  foreach t in array array['profiles','projects','project_members','tasks','calendar_notes','library_items','reviews',
                           'attachments','activity_log','kb_pages','finance_sources','finance_snapshots','settings'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Profiles are created automatically for invited users
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, color)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), initcap(split_part(new.email, '@', 1))),
    (array['orange', 'blue', 'green', 'purple', 'pink', 'brown'])[1 + (select count(*) from public.profiles) % 6]
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Activity log — written by the database, mirrors src/lib/data/activity.ts
-- ─────────────────────────────────────────────────────────────

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor   uuid := auth.uid();
  v_action  text;
  v_type    text;
  v_label   text;
  v_project uuid;
  v_meta    jsonb := '{}';
begin
  if tg_table_name = 'projects' then
    v_type := 'project'; v_label := new.name; v_project := new.id;
    if tg_op = 'INSERT' then
      v_action := 'created';
    elsif new.status is distinct from old.status then
      if new.status = 'completed' then v_action := 'completed';
      else v_action := 'status_changed'; v_meta := jsonb_build_object('from', old.status, 'to', new.status);
      end if;
    elsif coalesce(new.next_action, '') <> coalesce(old.next_action, '') and new.next_action is not null then
      v_action := 'next_action_set'; v_meta := jsonb_build_object('next_action', new.next_action);
    end if;

  elsif tg_table_name = 'tasks' then
    v_type := 'task'; v_label := new.title; v_project := new.project_id;
    if tg_op = 'INSERT' then
      v_action := 'created';
    elsif new.status is distinct from old.status then
      if new.status = 'done' then v_action := 'completed';
      else v_action := 'status_changed'; v_meta := jsonb_build_object('from', old.status, 'to', new.status);
      end if;
    elsif new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
      v_action := 'assigned'; v_meta := jsonb_build_object('to', new.assignee_id);
    end if;

  elsif tg_table_name = 'calendar_notes' then
    if tg_op = 'INSERT' then
      v_type := 'calendar_note'; v_label := coalesce(nullif(new.title, ''), new.date::text);
      v_action := 'created'; v_meta := jsonb_build_object('date', new.date);
    end if;

  elsif tg_table_name = 'library_items' then
    if tg_op = 'INSERT' then
      v_type := 'library_item'; v_label := new.name; v_project := new.project_id; v_action := 'added';
    end if;

  elsif tg_table_name = 'reviews' then
    v_type := 'review'; v_label := new.period_start::text; v_meta := jsonb_build_object('period', new.period);
    v_action := case when tg_op = 'INSERT' then 'created' else 'edited' end;

  elsif tg_table_name = 'kb_pages' then
    v_type := 'kb_page'; v_label := new.title;
    v_action := case when tg_op = 'INSERT' then 'created' else 'edited' end;
  end if;

  if v_action is null then
    return new;
  end if;

  -- Collapse autosave "edited" entries within 10 minutes.
  if v_action = 'edited' and exists (
    select 1 from public.activity_log
    where entity_id = new.id and actor_id is not distinct from v_actor and action = 'edited'
      and created_at > now() - interval '10 minutes'
  ) then
    return new;
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, entity_label, project_id, meta)
  values (v_actor, v_action, v_type, new.id, coalesce(v_label, ''), v_project, v_meta);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['projects', 'tasks', 'calendar_notes', 'library_items', 'reviews', 'kb_pages'] loop
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
end $$;

-- Keep the 5 newest finance snapshots per source.
create or replace function public.prune_finance_snapshots()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.finance_snapshots
  where source_id = new.source_id
    and id not in (
      select id from public.finance_snapshots where source_id = new.source_id order by fetched_at desc limit 5
    );
  return null;
end $$;

create trigger finance_snapshots_prune
  after insert on public.finance_snapshots
  for each row execute function public.prune_finance_snapshots();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — every studio member can read and write shared data.
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member());
create policy "members update profiles" on public.profiles for update to authenticated using (public.is_member()) with check (public.is_member());

do $$
declare t text;
begin
  foreach t in array array['projects','project_members','tasks','calendar_notes','library_items','reviews',
                           'attachments','kb_pages','finance_sources','finance_snapshots','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members full access" on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

-- Activity is written only by the trigger (security definer); clients can read it.
alter table public.activity_log enable row level security;
create policy "members read activity" on public.activity_log for select to authenticated using (public.is_member());

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table
  public.profiles, public.projects, public.project_members, public.tasks, public.calendar_notes,
  public.library_items, public.reviews, public.attachments, public.activity_log, public.kb_pages,
  public.finance_sources, public.finance_snapshots, public.settings;

-- ─────────────────────────────────────────────────────────────
-- Storage — private bucket for native uploads
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do nothing;

create policy "members read attachments" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_member());
create policy "members upload attachments" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_member());
create policy "members update attachments" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and public.is_member());
create policy "members delete attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.is_member());

-- Workspace defaults
insert into public.settings (key, value)
values ('workspace', '{"name": "Studio Spot", "currency": "EUR", "week_starts_on": 1}')
on conflict (key) do nothing;
