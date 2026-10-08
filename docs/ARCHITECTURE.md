# Spot OS — Architecture

This document answers the brief's "first task" list: schema, routes, components, realtime, Google integrations, risks, simplifications and the phase plan. It also records what V1 actually ships.

---

## 1. Database schema

`supabase/migrations/0001_init.sql` holds the full schema. All tables use `uuid` keys, `created_at` / `updated_at` (maintained by trigger), foreign keys, and RLS.

| Table | Purpose | Notes |
| --- | --- | --- |
| `profiles` | One row per member (FK → `auth.users`) | Created by the `on_auth_user_created` trigger. Membership = having a profile. |
| `projects` | Project, type, status, client, CD, lead, dates, description, **next_action**, `notes_html` | `type` / `status` are text + `check` (easier to evolve than PG enums). |
| `milestones` | A project's timeline: ordered steps (`sort_order`), optional `due_date`; tasks point at one via `tasks.milestone_id` | A milestone is done when it has tasks and all are done. The project's **next step** is derived (`lib/milestones.ts`): the first unfinished milestone. `projects.next_action` is legacy and no longer edited. |
| `project_members` | People associated with a project | `unique(project_id, profile_id)` |
| `tasks` | Title, description, assignee, status, priority, due date, project | `project_id` nullable (studio-level tasks such as invoicing). `completed_at` set on Done. `sort_order` (0008) is the hand-dragged position inside a milestone; null = not dragged yet (those follow, by due date). |
| `calendar_notes` | Rich-text notes per date | Several notes per day. HTML from the editor. |
| `attachments` | **Native uploads**: calendar, project and review files | One table with three nullable FKs + `check (num_nonnulls(...) = 1)`. Replaces `calendar_attachments` and `project_files`. |
| `library_items` | Indexed links and docs (Drive, Docs, Sheets, PDFs, templates, URLs) | `project_id` nullable. This replaces `links`, `documents` **and** `project_links`. A project's Links tab is just a filtered view. |
| `reviews` | Monthly and quarterly reviews | `period` = `month`/`quarter`, `unique(period, period_start)`. Replaces the two separate review tables. |
| `activity_log` | Lightweight history | Written **only by the database** (`log_activity` trigger). Clients can read it but can't write to it. |
| `kb_pages` | Spot Base pages (Markdown) | **SPOT.md is derived from these pages**, not stored a second time. |
| `finance_sources` | Source kind (`upload` / `demo`), last uploaded file name + configurable column **mapping** (`jsonb`) | |
| `finance_snapshots` | Cached, normalized entries | Pruned to the 5 newest rows per source by trigger. |
| `settings` | Workspace settings (`key` → `jsonb`) | Per-device preferences (theme, finance reveal) stay in `localStorage`. The `tags` key holds custom tag names + colours for projects and Library. |
| `notifications` | @mention notifications (0002) | Recipient-only RLS: you read and mark your own; any member can create one for another member. |

`0002_tags_pins_mentions.sql` adds project `tags`, `note`, `cover` (banner) and `cover_position`; Library `pinned` (for everyone) and `pinned_by` (pin for me); `attachments.kb_page_id` (Spot Base brand assets); and the `notifications` table.

**RLS:** `public.is_member()` (security definer) checks that `auth.uid()` has a profile. Every table gets one "members full access" policy. The exceptions: `profiles` allows select and update only, and `activity_log` allows select only. Storage policies apply the same rule to the private `attachments` bucket. The service-role key is never used by the app.

## 2. Route structure

```
/login                     email + password or magic link (demo: pick a member)
/auth/callback             PKCE code exchange for magic links / invites
/                          Home — ?view=personal|studio (old finance/performance links redirect to Library)
/calendar                  ?date=YYYY-MM-DD&view=month|quarter|year&note=<id>
/projects                  ?view=table|board — grouped by status: active, blocked, review, backlog, completed, archived
/projects/tasks            ?filter=all|mine|member:<id>|overdue|today|upcoming|completed
/projects/[id]             ?tab=overview|tasks|files|links|notes|activity
/library                   ?tab=resources|finance|performance
/reviews, /reviews/[id]
/spot-base, /spot-base/[slug], /spot-base/spot-md   (inside Library; overview = Team, What/Why/How/Ethos, Brand assets)
/settings                  ?section=appearance|notifications|workspace|finance|integrations|data
```

`?task=<id>` on any page opens that task in the side peek. Attention items and search results use it for deep links.

## 3. Folder / component architecture

```
src/
  app/                      routes only — thin server components that render a view
  proxy.ts                  Supabase session refresh + auth redirect (Next 16 "proxy" = middleware)
  lib/
    types.ts                entity types (1:1 with SQL)
    constants.ts            statuses, types, priorities, colours
    selectors.ts            pure derived data: attention, workload, overdue, period metrics
    store.tsx               WorkspaceProvider: snapshot + realtime + optimistic mutations
    data/
      adapter.ts            DataAdapter interface (the only persistence seam)
      supabase-adapter.ts   Postgres + Realtime + Storage
      demo-adapter.ts       localStorage + BroadcastChannel (localhost without a backend)
      activity.ts           activity rules (mirrors the SQL trigger, used in demo mode)
      seed.ts, kb-defaults.ts
    finance/                CSV parsing, mapping → normalized entries, period totals, useFinance
    reviews.ts, spot-md.ts, markdown.ts, hooks.ts, utils.ts
    supabase/               env, browser + server clients
  components/
    ui/                     design system: Button, Tag/StatusTag, Popover, Picker, fields, Dialog, SidePeek, Tabs…
    shell/                  Sidebar (drag to reorder its top buttons), Topbar/Page (back button via nav-history),
                            CommandPalette (⌘K), theme + colour themes, quick-add (Home + button, Shift+A per page)
    home/ projects/ tasks/ calendar/ library/ reviews/ spot-base/ settings/
    editor/rich-editor.tsx  Tiptap (headings, bold/italic, lists, checklists, links, images)
```

**Design system:** the tokens in `globals.css` are derived from Notion's web UI. That means a warm off-white sidebar (`#F8F8F7`), warm near-black text (`#32302C`), hairline dividers (`rgba(55,53,47,.09)`), Notion's muted tag palette with status dots, one blue accent (`#2383E2`), the system font stack, 30px rows, and layered menu shadows. Light and dark themes are both supported, and Settings → Appearance offers colour themes (Ocean, Forest, Sunset, Grape, Rose, Graphite) that override the accent and surface tokens via `data-palette` (end of `direction-1.css`).

**Per-device preferences** (`usePref` in `lib/hooks.ts`, localStorage): theme and colour theme, sidebar order, the project page layout (1 = details under the title, 2 = details in a right-hand panel) and each member's pinned Home view (`home-pin:<profile id>`).

**Invoices** (`invoices`, migration 0010) belong to a project: number, what it's for, amount, issued/due dates, status `not_sent | sent | cleared` and an optional link. Shown on the project's Invoices tab with totals.

**Custom task statuses** (0010): `projects.task_statuses` is a list of `{ id, label, color, base }`; `base` is the built-in status it counts as, so done/overdue/progress logic never changes. `tasks.custom_status` holds the chosen one (`lib/task-statuses.ts`). Ticking a checkbox resets it, and the task then shows its project's first status with that base.

**Task views**: Tasks page — Table, Board (kanban, drag between columns), List, Grid, Gantt; a project's Timeline tab — Milestones, Board (its own statuses), List, Grid, Gantt (bars from creation to due date, grouped by milestone).

**Activity** (`/activity`): every logged change, grouped by day, filterable by kind, person and project. The `log_activity` trigger (0010) also records invoices, milestones, files/links and deletions (deleted rows keep their project's name in `meta`, without a project link so the entry survives the project).

**Confirmations** use the in-app `useConfirm()` dialog, never `window.confirm()` (a browser's "don't show more dialogs" makes it return false forever).

**Voice typing**: focusing any text field shows a mic at its edge (or Alt+V) — the Web Speech API types at the cursor (Chrome, Edge, Safari).

**Shift+A** runs the current page's add action (`usePageAdd`): Projects → new project, Tasks and a project → new task (in its current milestone), Calendar → note, Library → link, Reviews → new review, Spot Base → page, Home → the Quick Add menu. Elsewhere it opens the Quick Add chooser. It's ignored while typing or with a dialog/menu open.

## 4. Realtime architecture

- On load, the client fetches a full snapshot. For a 3-person studio this is a few hundred rows. `activity_log` is capped at 300 rows and snapshots at 10.
- One channel (`spotos-db`) subscribes to `postgres_changes` on `public`. Every insert, update and delete is applied to the in-memory store as an idempotent upsert or delete, so echoes of our own writes are harmless.
- The client subscribes **before** loading so no change is missed in between.
- Mutations are **optimistic**: they apply locally, persist, then reconcile with the returned row. On error the change rolls back and a toast appears.
- **Last write wins.** Rich-text editors and review fields only accept remote content while the field isn't focused, so incoming changes never overwrite what someone is typing. There is no collaborative editing in V1, as the brief specifies.
- Cascaded deletes, for example a project's tasks, arrive as their own realtime events.
- Demo mode mimics this with `BroadcastChannel` across tabs.

## 5. Google Drive & Calendar, and finance

**Calendar.** Calendar → Export picks a week, month or year around the selected day and downloads an `.ics` file (deadlines, open tasks due, day notes as all-day events with stable UIDs) or a Markdown digest. "Import into Google Calendar…" downloads the file and opens Google Calendar's import page. With `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set (and the Google Calendar API enabled), **Sync** pushes the same events into the signed-in person's primary calendar via `events.import` (scope `calendar.events`), so re-syncing updates instead of duplicating. A live subscription feed isn't offered: demo data lives in the browser, and a Supabase feed would need a server-side token.

**Drive / Library.** Drive stays the main file store. Library only indexes URLs. Pasting a link auto-detects its type (Doc, Sheet, Slides, Folder, File, PDF) and suggests a name. The optional **Google Picker** button appears only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_API_KEY` are set. It uses the `drive.file` scope and only reads the picked file's URL, name and type. Nothing is copied into Supabase.

**Finance (uploaded spreadsheet).** The spreadsheet is the source of truth, and Spot OS never connects to it, so it can stay private. No Google access is needed.
1. Once a month a member exports the sheet as `.xlsx` or `.csv` and drops it into Settings → Finance.
2. The file is read **in the browser** (`lib/finance/read-file.ts`, `read-excel-file` loaded on demand). It's never uploaded or stored. Every tab becomes text rows; the tab containing the date column is picked automatically, and title rows above the header are skipped.
3. The **mapping** (`finance_sources.mapping`) says which header means date, amount (or separate income and expense columns), type values, category, status, outstanding values, balance column, opening balance, date format and currency. Columns are matched by header name, so the sheet can change without code changes. A live preview shows what will be saved.
4. On save, entries are normalized into `{date, amount±, category, outstanding}` and stored as a `finance_snapshots` row. Insights and Reviews summarize the newest snapshot into available, outstanding, monthly and quarterly totals. Raw rows aren't kept, so a mapping change applies on the next upload.
5. After 35 days without an upload, Home and Insights show a reminder.
6. Every finance value is **hidden by default** behind Reveal (stored per device).

*Why not a live Google Sheet link?* The earlier version fetched the sheet as CSV, which required "anyone with the link can view", so anyone holding the URL could read the studio's finances. A monthly upload is enough for monthly and quarterly reviews and needs no access to anyone's Google account. If live numbers are ever needed, use a Google service account that the sheet is shared with (read-only, key in a server env var), not link sharing.

## 6. Technical risks & assumptions

| Risk / assumption | Mitigation |
| --- | --- |
| Finance numbers are only as fresh as the last upload | 35-day reminder on Home and Insights. Service-account path above if live data is needed. |
| Sheet structure changes | Configurable mapping plus a live upload preview with warnings. |
| Signed URLs for uploads expire (set to 1 year) | Paths are stored, so URLs can be regenerated. Alternatively switch the bucket to public with UUID paths. |
| Simultaneous edits of the same note | Last write wins (accepted in the brief). Remote updates don't apply to a focused editor. |
| Snapshot loading won't scale to large data | Fine for 3 people and years of data. Paginate `activity_log` and `calendar_notes` if they grow. |
| Membership is "has a profile" | Disable public sign-ups in Supabase Auth and invite the three members. |
| Next.js 16 conventions (`proxy.ts`, async `params`) | Followed the bundled docs. `cacheComponents` is off because the app is client-data driven. |
| Demo mode stores files as data URLs | Capped at 2 MB per file and only used on localhost. Supabase Storage has no such limit. |

## 7. Removed or simplified

- **Merged** `links` + `documents` + `project_links` into `library_items`, so there's no duplicate entry.
- **Merged** `monthly_reviews` + `quarterly_reviews` into `reviews`.
- **Merged** `calendar_attachments` + `project_files` into `attachments`.
- **SPOT.md** is generated from Spot Base pages, not maintained as a second copy.
- **Activity** is written by DB triggers, not by client code.
- **Notifications:** only @mentions. Typing @ in a project note, task description, calendar note or project notes offers members; the store diffs mentions on save (`src/lib/mentions.ts`) and creates a notification per newly mentioned person. They arrive in the sidebar **Inbox** live (Realtime), with a toast and optional desktop notification.
- **Kanban:** the project board has fixed status columns and drag to change status. Nothing is configurable.
- **Performance:** in Library → Performance — six-period bar charts (monthly or quarterly) per metric, with a table view.
- **Project notes:** one rich-text field per project instead of a notes table.
- Not built (per brief): chat, CRM, invoicing, time tracking, collaborative editing, Drive clone, AI assistant, complex permissions, dashboard builder, native app.

## 8. Phase status

| Phase | Status |
| --- | --- |
| 1 Foundation: Next.js, Supabase wiring, auth, schema, navigation, layout, theme | ✅ |
| 2 Projects: projects, tasks, assignments, statuses, filters, realtime | ✅ |
| 3 Home: personal / studio / finance / performance, attention, next actions, activity | ✅ |
| 4 Calendar: month / quarter / year views, date notes, rich text, images, attachments, note export (MD / HTML / PDF), period export (.ics / Markdown), Google Calendar import + optional direct sync | ✅ |
| 5 Library: links, docs, project association, tags, search, Drive detection, optional Picker | ✅ |
| 6 Reviews: monthly / quarterly, auto metrics from Spot OS + finance | ✅ |
| 7 Finance: monthly Excel / CSV upload, mapping layer, totals, hide / reveal, stale reminder | ✅ |
| 8 Spot Base: pages, Markdown editing, SPOT.md | ✅ |
| 9 Polish: settings, empty / loading / error states, responsive, ⌘K search | ✅ first pass. A security review against a live Supabase project is still to do. |
