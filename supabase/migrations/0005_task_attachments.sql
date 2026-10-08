-- Spot OS 0005 — files and links on tasks.
-- Tasks (and calendar notes) can hold one small file (≤ 500 KB, enforced in the app) plus
-- any number of links to Google Drive, Dropbox, Figma… Links are attachment rows with
-- mime_type 'text/uri-list', size 0 and an empty storage_path.

alter table public.attachments add column if not exists task_id uuid references public.tasks (id) on delete cascade;
create index if not exists attachments_task_idx on public.attachments (task_id);
alter table public.attachments drop constraint if exists attachments_one_owner;
alter table public.attachments add constraint attachments_one_owner
  check (num_nonnulls(note_id, project_id, review_id, kb_page_id, task_id) = 1);
