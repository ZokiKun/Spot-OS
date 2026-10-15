/**
 * What's new in Spot OS, newest first. The "What's new" screen opens once for each release a
 * person hasn't seen yet, so when you ship something people will notice, add it here: a new
 * release at the top (id = the date, plus -2, -3… for a second release that day), or more items
 * in today's. Write for the team, not for developers: what they can now do and where.
 */
export interface Release {
  id: string;
  /** ISO date it went live. */
  date: string;
  title: string;
  items: { title: string; body?: string }[];
}

export const CHANGELOG: Release[] = [
  {
    id: "2026-10-15-3",
    date: "2026-10-15",
    title: "Task descriptions in project notes",
    items: [
      { title: "All descriptions in one place", body: "A project's Notes tab now lists every task description below your notes, each under its task's title. Click a title to open the task." },
    ],
  },
  {
    id: "2026-10-15-2",
    date: "2026-10-15",
    title: "Filters, a sidebar shortcut and this screen",
    items: [
      {
        title: "Filter tasks",
        body: "Filter on the Tasks page and on every project's Tasks tab: by status, assignee, due date (overdue, today, next 7 days…) and priority. It works with Sort and every view.",
      },
      { title: "Shift+S hides the sidebar", body: "Press Shift+S anywhere you're not typing to collapse or expand the sidebar. ⌘\\ still works." },
      { title: "What's new", body: "When Spot OS updates, you'll get a prompt to reload, then a short list like this one. Open it again from the sidebar." },
    ],
  },
  {
    id: "2026-10-15",
    date: "2026-10-15",
    title: "Sorting everywhere, project icons and a slimmer sidebar",
    items: [
      { title: "Sort by any column", body: "Click a column header on Home, Projects, Tasks or invoices to sort; click again to reverse. Tasks and Library also get a Sort menu." },
      { title: "Collapse the sidebar", body: "Shrink the sidebar to icons with the button at its top." },
      { title: "Any emoji as a project icon", body: "Type or paste any emoji, or upload a small image as a custom emoji the whole team can reuse." },
      { title: "Your projects in the sidebar", body: "Switch Active projects between Only you and Everyone, and drag yours into your own order." },
      { title: "Completed today", body: "Home shows what you ticked off today, next to what's still open." },
      { title: "In-house is now Studio", body: "The two project types are merged." },
    ],
  },
  {
    id: "2026-10-14",
    date: "2026-10-14",
    title: "Richer task descriptions and notification sounds",
    items: [
      { title: "Task descriptions", body: "Headings, lists, checklists, links and images, using the same editor as notes." },
      { title: "Notification sounds", body: "Pick Chime, Ding, Pop, Bell or Off in Settings → Notifications." },
      { title: "Today keeps finished tasks", body: "Tasks you complete stay in Today, struck through." },
    ],
  },
  {
    id: "2026-10-09",
    date: "2026-10-09",
    title: "Bulk edit, milestone sorting and board columns",
    items: [
      { title: "Edit several tasks at once", body: "Tick tasks (shift-click for a range) to change status, assignees, due date or priority together, or duplicate or delete them." },
      { title: "Sort inside milestones", body: "Each milestone has its own Sort menu, plus Select to tick all of its tasks." },
      { title: "Reorder board columns", body: "Hold and drag a column header on a board." },
    ],
  },
];

export const LATEST_RELEASE = CHANGELOG[0]!.id;

/** Releases newer than `seenId`, newest first. Someone who has never seen one gets just the latest. */
export function unseenReleases(seenId: string | null | undefined): Release[] {
  if (!seenId) return CHANGELOG.slice(0, 1);
  const at = CHANGELOG.findIndex((r) => r.id === seenId);
  return at < 0 ? CHANGELOG.slice(0, 1) : CHANGELOG.slice(0, at);
}
