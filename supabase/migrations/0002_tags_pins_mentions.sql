-- Spot OS 0002 — project tags, notes & banners, library pins, Spot Base brand assets, @mention notifications.

-- ─── Projects: custom tags + a short note shown in the table ───
alter table public.projects add column if not exists tags text[] not null default '{}';
alter table public.projects add column if not exists note text;

-- ─── Projects: banner (image URL or "gradient:<key>") ───
alter table public.projects add column if not exists cover text;
alter table public.projects add column if not exists cover_position smallint not null default 50 check (cover_position between 0 and 100);

-- ─── Library: pin for everyone, or pin for me ───
alter table public.library_items add column if not exists pinned boolean not null default false;
alter table public.library_items add column if not exists pinned_by uuid[] not null default '{}';

-- ─── Attachments can belong to a Spot Base page (logo, brand files) ───
alter table public.attachments add column if not exists kb_page_id uuid references public.kb_pages (id) on delete cascade;
create index if not exists attachments_kb_page_idx on public.attachments (kb_page_id);
alter table public.attachments drop constraint if exists attachments_check;
alter table public.attachments drop constraint if exists attachments_one_owner;
alter table public.attachments add constraint attachments_one_owner
  check (num_nonnulls(note_id, project_id, review_id, kb_page_id) = 1);

-- ─── Notifications (@mentions) ───
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  actor_id      uuid references public.profiles (id) on delete set null,
  kind          text not null default 'mention' check (kind in ('mention')),
  entity_type   text not null check (entity_type in ('project', 'task', 'calendar_note', 'kb_page')),
  entity_id     uuid not null,
  entity_label  text not null default '',
  href          text not null,
  excerpt       text not null default '',
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create trigger notifications_touch before update on public.notifications
  for each row execute function public.touch_updated_at();

alter table public.notifications enable row level security;
-- You see and mark read only your own notifications; any member can notify another member.
create policy "read own notifications" on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "members create notifications" on public.notifications for insert to authenticated
  with check (public.is_member() and actor_id = auth.uid());
create policy "mark own notifications" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

alter publication supabase_realtime add table public.notifications;
