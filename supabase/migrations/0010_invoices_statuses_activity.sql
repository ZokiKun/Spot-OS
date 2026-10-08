-- Spot OS 0010 — project invoices, custom task statuses, and an activity log for everything.
-- Safe to run more than once.

-- ─── Invoices: each project keeps a list of its invoices ───
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  number      text not null default '',
  title       text not null default '',
  amount      numeric,
  currency    text,
  issue_date  date,
  due_date    date,
  status      text not null default 'not_sent' check (status in ('not_sent', 'sent', 'cleared')),
  url         text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists invoices_project_idx on public.invoices (project_id);

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

alter table public.invoices enable row level security;
drop policy if exists "members read" on public.invoices;
drop policy if exists "editors insert" on public.invoices;
drop policy if exists "editors update" on public.invoices;
drop policy if exists "editors delete" on public.invoices;
create policy "members read" on public.invoices for select to authenticated using (public.is_member());
create policy "editors insert" on public.invoices for insert to authenticated with check (public.can_edit());
create policy "editors update" on public.invoices for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "editors delete" on public.invoices for delete to authenticated using (public.can_edit());
grant select, insert, update, delete on public.invoices to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.invoices;
exception when duplicate_object then null;
end $$;

-- ─── Custom task statuses per project ───
-- projects.task_statuses: [{ id, label, color, base }] — base is the built-in status it counts as
-- (todo | in_progress | blocked | review | done), so "done", overdue and progress keep working.
-- tasks.custom_status: the id of the project's status the task is in (null = the built-in status).
alter table public.projects add column if not exists task_statuses jsonb;
alter table public.tasks add column if not exists custom_status text;

-- ─── Activity: also invoices, milestones, files and deletions ───
alter table public.activity_log drop constraint if exists activity_log_entity_type_check;
alter table public.activity_log add constraint activity_log_entity_type_check
  check (entity_type in ('project', 'task', 'calendar_note', 'library_item', 'review', 'kb_page', 'invoice', 'milestone', 'attachment'));

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor   uuid := auth.uid();
  v_action  text;
  v_type    text;
  v_label   text;
  v_project uuid;
  v_meta    jsonb := '{}';
  v_id      uuid;
  v_added   uuid;
begin
  -- Deletions: logged without a project link (the project row may be going away too), and
  -- skipped when the parent project is being deleted (its tasks, milestones… cascade).
  if tg_op = 'DELETE' then
    if tg_table_name = 'projects' then
      v_type := 'project'; v_label := old.name;
    elsif tg_table_name in ('tasks', 'milestones', 'invoices') then
      if old.project_id is not null and not exists (select 1 from public.projects where id = old.project_id) then
        return old;
      end if;
      -- Separate branches: a record field is only looked up when its statement runs.
      if tg_table_name = 'tasks' then
        v_type := 'task'; v_label := old.title;
      elsif tg_table_name = 'milestones' then
        v_type := 'milestone'; v_label := old.title;
      else
        v_type := 'invoice'; v_label := coalesce(nullif(old.number, ''), nullif(old.title, ''), 'invoice');
      end if;
      v_meta := jsonb_build_object('project_id', old.project_id,
        'project', (select name from public.projects where id = old.project_id));
    else
      return old;
    end if;
    insert into public.activity_log (actor_id, action, entity_type, entity_id, entity_label, project_id, meta)
    values (v_actor, 'deleted', v_type, old.id, coalesce(v_label, ''), null, v_meta);
    return old;
  end if;

  v_id := new.id;

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
    elsif new.status is distinct from old.status or new.custom_status is distinct from old.custom_status then
      if new.status = 'done' and old.status is distinct from 'done' then v_action := 'completed';
      else
        v_action := 'status_changed';
        v_meta := jsonb_build_object('from', old.status, 'to', new.status, 'to_custom', new.custom_status);
      end if;
    else
      select x into v_added from unnest(coalesce(new.assignee_ids, '{}')) x
        where not (x = any (coalesce(old.assignee_ids, '{}'))) limit 1;
      if v_added is null and new.assignee_id is distinct from old.assignee_id then v_added := new.assignee_id; end if;
      if v_added is not null then
        v_action := 'assigned'; v_meta := jsonb_build_object('to', v_added);
      end if;
    end if;

  elsif tg_table_name = 'milestones' then
    if tg_op = 'INSERT' then
      v_type := 'milestone'; v_label := new.title; v_project := new.project_id; v_action := 'created';
    end if;

  elsif tg_table_name = 'invoices' then
    v_type := 'invoice'; v_project := new.project_id;
    v_label := coalesce(nullif(new.number, ''), nullif(new.title, ''), 'invoice');
    if tg_op = 'INSERT' then
      v_action := 'created';
    elsif new.status is distinct from old.status then
      v_action := 'status_changed'; v_meta := jsonb_build_object('from', old.status, 'to', new.status);
    end if;

  elsif tg_table_name = 'attachments' then
    if tg_op = 'INSERT' then
      v_type := 'attachment'; v_label := new.name; v_action := 'added';
      v_project := coalesce(new.project_id, (select project_id from public.tasks where id = new.task_id));
      v_meta := jsonb_build_object('link', new.mime_type = 'text/uri-list', 'task_id', new.task_id,
        'note_id', new.note_id, 'kb_page_id', new.kb_page_id, 'review_id', new.review_id, 'url', new.url);
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
    where entity_id = v_id and actor_id is not distinct from v_actor and action = 'edited'
      and created_at > now() - interval '10 minutes'
  ) then
    return new;
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, entity_label, project_id, meta)
  values (v_actor, v_action, v_type, v_id, coalesce(v_label, ''), v_project, v_meta);
  return new;
end $$;

-- Triggers: insert/update on everything logged, plus delete on projects, tasks, milestones, invoices.
do $$
declare t text;
begin
  foreach t in array array['projects', 'tasks', 'calendar_notes', 'library_items', 'reviews', 'kb_pages', 'milestones', 'invoices', 'attachments'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity', t);
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
  foreach t in array array['projects', 'tasks', 'milestones', 'invoices'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity_delete', t);
    execute format('create trigger %I before delete on public.%I for each row execute function public.log_activity()', t || '_activity_delete', t);
  end loop;
end $$;
