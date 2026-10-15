-- "In-house" and "Studio" projects are the same thing — keep Studio only.
-- The app already shows in_house rows as Studio, so this is cleanup and can run any time.
update public.projects set type = 'studio' where type = 'in_house';

alter table public.projects drop constraint if exists projects_type_check;
alter table public.projects add constraint projects_type_check check (type in ('client', 'studio', 'personal'));
