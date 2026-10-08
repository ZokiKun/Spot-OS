-- Spot OS 0007 — view-only members (e.g. bot accounts).
-- profiles.access is 'editor' (default, everyone today) or 'viewer'. Viewers can read everything
-- members can read, mark their own notifications read, and edit their own name/colour —
-- nothing else. Enforced here with RLS, so it holds for the API too, not just the app.
--
-- Make someone view-only (SQL editor), or use Settings → Workspace → Members:
--   update public.profiles set access = 'viewer' where email in ('bot1@…', 'bot2@…');

alter table public.profiles add column if not exists access text not null default 'editor'
  check (access in ('editor', 'viewer'));

create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and access = 'editor');
$$;
grant execute on function public.can_edit() to authenticated;

-- ─── Shared tables: members read, editors write ───
do $$
declare t text;
begin
  foreach t in array array['projects','project_members','milestones','tasks','calendar_notes','library_items','reviews',
                           'attachments','kb_pages','finance_sources','finance_snapshots','settings'] loop
    execute format('drop policy if exists "members full access" on public.%I', t);
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('drop policy if exists "editors delete" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit())', t);
  end loop;
end $$;

-- ─── Profiles: editors edit anyone, viewers only themselves ───
drop policy if exists "members update profiles" on public.profiles;
create policy "members update profiles" on public.profiles for update to authenticated
  using (public.can_edit() or id = auth.uid()) with check (public.can_edit() or id = auth.uid());

-- Only editors change access — a viewer can't promote themselves. The SQL editor / service role
-- (no auth.uid()) can always change it.
create or replace function public.guard_profile_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.access is distinct from old.access and auth.uid() is not null and not public.can_edit() then
    raise exception 'Only editors can change member access';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_access on public.profiles;
create trigger profiles_guard_access before update on public.profiles
  for each row execute function public.guard_profile_access();

-- ─── Notifications: only editors send @mentions (viewers still read/mark their own) ───
drop policy if exists "members create notifications" on public.notifications;
create policy "members create notifications" on public.notifications for insert to authenticated
  with check (public.can_edit() and actor_id = auth.uid());

-- ─── Storage: viewers can open files but not upload, replace or delete ───
drop policy if exists "members upload attachments" on storage.objects;
drop policy if exists "members update attachments" on storage.objects;
drop policy if exists "members delete attachments" on storage.objects;
create policy "members upload attachments" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_edit());
create policy "members update attachments" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and public.can_edit());
create policy "members delete attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.can_edit());
