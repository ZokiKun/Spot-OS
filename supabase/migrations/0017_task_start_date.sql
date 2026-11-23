-- Spot OS 0017 — optional start date on tasks, next to the due date.
-- Null = no start date: the Gantt bar then begins on the day the task was created.

alter table public.tasks add column if not exists start_date date;
