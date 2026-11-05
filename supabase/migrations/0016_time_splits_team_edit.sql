-- Time spent: anyone who can edit may fill in a teammate's split too, not only their own.
-- Viewers still only read.

drop policy if exists "own insert" on public.time_splits;
drop policy if exists "own update" on public.time_splits;
drop policy if exists "own delete" on public.time_splits;
drop policy if exists "editors insert" on public.time_splits;
drop policy if exists "editors update" on public.time_splits;
drop policy if exists "editors delete" on public.time_splits;
create policy "editors insert" on public.time_splits for insert to authenticated with check (public.can_edit());
create policy "editors update" on public.time_splits for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "editors delete" on public.time_splits for delete to authenticated using (public.can_edit());
