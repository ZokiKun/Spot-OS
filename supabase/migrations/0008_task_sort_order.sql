-- Spot OS 0008 — hand-ordered tasks on a project timeline.
-- sort_order is the task's position inside its milestone (or among the tasks outside any
-- milestone). Null = never dragged: those follow the dragged ones, in due-date order.

alter table public.tasks add column if not exists sort_order double precision;
