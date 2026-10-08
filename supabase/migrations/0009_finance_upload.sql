-- Spot OS 0009 — finance comes from an uploaded spreadsheet instead of a link-shared Google Sheet.
-- A member uploads the finance .xlsx / .csv in Settings → Finance (monthly). The browser reads it
-- and only the normalized entries are saved in finance_snapshots; the file itself is never stored.
-- The old "anyone with the link can view" Google Sheet source is retired.

alter table public.finance_sources add column if not exists file_name text;

-- Drop the old check (it only allows 'google_sheet_csv' | 'demo') before converting rows.
alter table public.finance_sources drop constraint if exists finance_sources_kind_check;
update public.finance_sources set kind = 'upload', url = null where kind = 'google_sheet_csv';
alter table public.finance_sources
  add constraint finance_sources_kind_check check (kind in ('upload', 'demo'));
alter table public.finance_sources alter column kind set default 'upload';
