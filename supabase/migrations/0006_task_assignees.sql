-- Spot OS 0006 — several people on one task.
-- assignee_ids holds everyone on the task (primary first). assignee_id stays as the primary
-- assignee so the activity trigger, the open-task index and old clients keep working.

alter table public.tasks add column if not exists assignee_ids uuid[] not null default '{}';
update public.tasks set assignee_ids = array[assignee_id] where assignee_id is not null and assignee_ids = '{}';
create index if not exists tasks_assignee_ids_idx on public.tasks using gin (assignee_ids);
