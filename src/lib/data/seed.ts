import { format, startOfMonth, subMonths } from "date-fns";
import type { Snapshot, Project, Task, Milestone, ProjectStatus, TaskStatus, TaskPriority, ProjectType } from "../types";
import { emptySnapshot } from "./adapter";
import { addDaysISO, nowISO, todayISO, uid } from "../utils";
import { DEMO_MAPPING } from "../finance/sample";
import { DEFAULT_KB_PAGES } from "./kb-defaults";

/** Demo workspace — dates are relative to today so Attention/Overdue always have something to show. */
export function buildSeed(): Snapshot {
  const s = emptySnapshot();
  const t = todayISO();
  const now = nowISO();
  const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  const stamp = { created_at: now, updated_at: now };

  const [alex, sam, jordan] = [
    { id: uid(), full_name: "Alex Rivera", email: "alex@studiospot.co", role_title: "Creative Director", color: "orange" },
    { id: uid(), full_name: "Sam Okafor", email: "sam@studiospot.co", role_title: "Design Lead", color: "blue" },
    { id: uid(), full_name: "Jordan Lee", email: "jordan@studiospot.co", role_title: "Producer", color: "green" },
  ].map((p) => ({ ...p, ...stamp }));
  s.profiles = [alex!, sam!, jordan!];

  const project = (
    name: string,
    icon: string,
    type: ProjectType,
    status: ProjectStatus,
    opts: Partial<Project> = {},
  ): Project => ({
    id: uid(),
    name,
    icon,
    type,
    status,
    client: null,
    client_contact: null,
    creative_director_id: alex!.id,
    lead_id: sam!.id,
    start_date: addDaysISO(t, -30),
    deadline: addDaysISO(t, 30),
    description: null,
    next_action: null,
    note: null,
    tags: [],
    cover: null,
    cover_position: 50,
    notes_html: null,
    created_by: alex!.id,
    created_at: ago(40),
    updated_at: ago(1),
    completed_at: status === "completed" ? ago(12) : null,
    ...opts,
  });

  const northwind = project("Northwind rebrand", "🧭", "client", "active", {
    client: "Northwind",
    client_contact: "Maya Chen · maya@northwind.com",
    lead_id: sam!.id,
    deadline: addDaysISO(t, 9),
    start_date: addDaysISO(t, -45),
    description: "Full identity refresh: logo system, typography, colour, and launch toolkit.",
    tags: ["branding", "retainer"],
    cover: "gradient:dusk",
    note: "Maya wants the compass mark — keep the wordmark as backup.",
  });
  const kestrel = project("Kestrel Labs website", "🪶", "client", "blocked", {
    client: "Kestrel Labs",
    client_contact: "Tom Ruiz · tom@kestrel.io",
    lead_id: jordan!.id,
    deadline: addDaysISO(t, 21),
    description: "Marketing site redesign and CMS migration.",
    tags: ["web"],
    note: "Blocked on IT since last week; escalate Friday if still stuck.",
  });
  const mora = project("Atelier Mora packaging", "🫙", "client", "review", {
    client: "Atelier Mora",
    client_contact: "Inès Mora",
    lead_id: alex!.id,
    deadline: addDaysISO(t, 4),
    description: "Packaging system for the autumn ceramics line.",
    tags: ["packaging", "print"],
    cover: "gradient:clay",
  });
  const site = project("Studio Spot site v2", "🟠", "in_house", "active", {
    lead_id: jordan!.id,
    deadline: addDaysISO(t, 40),
    description: "New studio website with case studies.",
    tags: ["web"],
    next_action: null,
  });
  const ops = project("Spot OS", "⚙️", "studio", "active", {
    lead_id: alex!.id,
    deadline: addDaysISO(t, 60),
    description: "Internal operating system for the studio.",
    tags: ["internal"],
  });
  const fieldnotes = project("Field Notes campaign", "📓", "client", "backlog", {
    client: "Field Notes Co.",
    start_date: addDaysISO(t, 14),
    deadline: addDaysISO(t, 75),
    description: "Spring campaign concepts.",
  });
  const archive = project("Lumen annual report", "📊", "client", "archived", {
    client: "Lumen Foundation",
    lead_id: alex!.id,
    start_date: addDaysISO(t, -160),
    deadline: addDaysISO(t, -95),
    description: "2025 annual report design and print.",
    tags: ["print"],
    completed_at: ago(100),
  });
  const typeface = project("Type specimen zine", "🔤", "personal", "completed", {
    lead_id: sam!.id,
    deadline: addDaysISO(t, -10),
    start_date: addDaysISO(t, -70),
    description: "Risograph zine of our custom display face.",
    tags: ["print"],
  });
  s.projects = [northwind, kestrel, mora, site, ops, fieldnotes, typeface, archive];

  s.project_members = [
    [northwind, alex, "Creative director"],
    [northwind, sam, "Lead designer"],
    [kestrel, jordan, "Producer"],
    [kestrel, sam, "Design"],
    [mora, alex, "Lead"],
    [site, jordan, "Lead"],
    [ops, alex, "Lead"],
  ].map(([p, m, role]) => ({
    id: uid(),
    project_id: (p as Project).id,
    profile_id: (m as { id: string }).id,
    role: role as string,
    ...stamp,
  }));

  const task = (
    title: string,
    projectId: string | null,
    assignee: string | null,
    status: TaskStatus,
    due: number | null,
    priority: TaskPriority = "medium",
    description: string | null = null,
  ): Task => ({
    id: uid(),
    project_id: projectId,
    milestone_id: null,
    title,
    description,
    assignee_id: assignee,
    status,
    priority,
    due_date: due == null ? null : addDaysISO(t, due),
    created_by: alex!.id,
    created_at: ago(20),
    updated_at: ago(status === "done" ? 3 : 1),
    completed_at: status === "done" ? ago(Math.abs(due ?? 3)) : null,
  });

  s.tasks = [
    task("Finalise logo lockups", northwind.id, sam!.id, "in_progress", 0, "high"),
    task("Colour system — accessibility check", northwind.id, sam!.id, "todo", 2),
    task("Brand guidelines layout", northwind.id, alex!.id, "todo", 6),
    task("Launch toolkit templates", northwind.id, jordan!.id, "todo", 8, "low"),
    task("Moodboard round 2", northwind.id, alex!.id, "done", -12),
    task("Client kickoff deck", northwind.id, jordan!.id, "done", -30),
    task("Request CMS credentials", kestrel.id, jordan!.id, "blocked", -3, "urgent", "Waiting on Kestrel IT since last week."),
    task("Homepage wireframes", kestrel.id, sam!.id, "review", -1, "high"),
    task("Content inventory", kestrel.id, jordan!.id, "done", -8),
    task("Sitemap sign-off", kestrel.id, alex!.id, "todo", 3),
    task("Dieline revisions", mora.id, alex!.id, "in_progress", -2, "high"),
    task("Print vendor quotes", mora.id, jordan!.id, "todo", 1),
    task("Photography brief", mora.id, sam!.id, "todo", 5, "low"),
    task("Case study: Northwind", site.id, jordan!.id, "todo", 12),
    task("Choose site framework", site.id, sam!.id, "done", -4),
    task("Write about page copy", site.id, alex!.id, "todo", null, "low"),
    task("Finance sheet mapping", ops.id, alex!.id, "in_progress", 0, "medium"),
    task("Invite team to Spot OS", ops.id, alex!.id, "todo", 2, "high"),
    task("Draft SPOT.md", ops.id, jordan!.id, "todo", 7),
    task("Concept routes", fieldnotes.id, sam!.id, "todo", 18),
    task("Send September invoices", null, jordan!.id, "todo", -1, "urgent"),
    task("Renew Adobe licences", null, jordan!.id, "todo", 4),
    task("Print and bind zine", typeface.id, sam!.id, "done", -11),
  ];

  // Timelines: [project, milestone, due offset, task titles under it]
  const timelines: [Project, string, number | null, string[]][] = [
    [northwind, "Discovery", -25, ["Client kickoff deck", "Moodboard round 2"]],
    [northwind, "Identity design", 2, ["Finalise logo lockups", "Colour system — accessibility check"]],
    [northwind, "Guidelines and launch", 9, ["Brand guidelines layout", "Launch toolkit templates"]],
    [kestrel, "Content and structure", 3, ["Content inventory", "Sitemap sign-off"]],
    [kestrel, "Design", 10, ["Homepage wireframes"]],
    [kestrel, "Build", 20, ["Request CMS credentials"]],
    [mora, "Packaging design", 0, ["Dieline revisions"]],
    [mora, "Production", 6, ["Print vendor quotes", "Photography brief"]],
    [site, "Planning", -4, ["Choose site framework"]],
    [site, "Content", 14, ["Case study: Northwind", "Write about page copy"]],
    [ops, "Setup", 2, ["Finance sheet mapping", "Invite team to Spot OS"]],
    [ops, "Documentation", 7, ["Draft SPOT.md"]],
    [fieldnotes, "Concepts", 18, ["Concept routes"]],
    [typeface, "Print", -11, ["Print and bind zine"]],
  ];
  const order = new Map<string, number>();
  s.milestones = timelines.map(([p, title, due, taskTitles]): Milestone => {
    const sort_order = order.get(p.id) ?? 0;
    order.set(p.id, sort_order + 1);
    const m: Milestone = { id: uid(), project_id: p.id, title, due_date: due == null ? null : addDaysISO(t, due), sort_order, created_by: alex!.id, ...stamp };
    s.tasks.forEach((task) => {
      if (task.project_id === p.id && taskTitles.includes(task.title)) task.milestone_id = m.id;
    });
    return m;
  });

  s.library_items = [
    ["Brand guidelines template", "template", "https://docs.google.com/document/d/brand-template", null, ["brand", "template"], "Starting point for every identity project."],
    ["Studio finance 2026", "google_sheet", "https://docs.google.com/spreadsheets/d/finance-2026", null, ["finance"], "Source of truth for income and expenses."],
    ["Client contracts", "drive_folder", "https://drive.google.com/drive/folders/contracts", null, ["legal"], null],
    ["Northwind — shared drive", "drive_folder", "https://drive.google.com/drive/folders/northwind", northwind.id, ["client"], "All Northwind deliverables."],
    ["Northwind brief", "google_doc", "https://docs.google.com/document/d/northwind-brief", northwind.id, ["brief"], null],
    ["Kestrel sitemap", "google_sheet", "https://docs.google.com/spreadsheets/d/kestrel-sitemap", kestrel.id, ["web"], null],
    ["Mora dielines v3", "pdf", "https://drive.google.com/file/d/mora-dielines/view", mora.id, ["print"], null],
    ["Proposal deck template", "google_slides", "https://docs.google.com/presentation/d/proposal", null, ["sales", "template"], null],
    ["Type foundry licences", "url", "https://example.com/licences", null, ["tools"], "Where our font licences live."],
  ].map(([name, type, url, project_id, tags, description], i) => ({
    id: uid(),
    name: name as string,
    type: type as Snapshot["library_items"][number]["type"],
    url: url as string,
    project_id: project_id as string | null,
    tags: tags as string[],
    description: description as string | null,
    pinned: i === 0 || i === 1,
    pinned_by: i === 7 ? [alex!.id] : [],
    created_by: [alex, sam, jordan][i % 3]!.id,
    created_at: ago(30 - i),
    updated_at: ago(10 - i),
  }));

  s.calendar_notes = [
    {
      id: uid(),
      date: addDaysISO(t, -2),
      title: "Northwind check-in",
      content_html:
        "<h2>Notes</h2><ul><li><p>Maya prefers the <strong>compass</strong> mark over the wordmark-only route.</p></li><li><p>Launch moved to end of month.</p></li></ul><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><p>Send revised lockups</p></li></ul>",
      created_by: alex!.id,
      updated_by: alex!.id,
      created_at: ago(2),
      updated_at: ago(2),
    },
    {
      id: uid(),
      date: t,
      title: "Studio stand-up",
      content_html:
        "<p>Focus this week: Northwind finals and unblocking Kestrel.</p><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"true\"><p>Agree owners for Mora feedback</p></li><li data-type=\"taskItem\" data-checked=\"false\"><p>Chase Kestrel IT</p></li></ul>",
      created_by: jordan!.id,
      updated_by: jordan!.id,
      created_at: now,
      updated_at: now,
    },
  ];

  const lastMonth = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
  s.reviews = [
    {
      id: uid(),
      period: "month",
      period_start: lastMonth,
      planned: "Ship Mora packaging round 1\nKick off Northwind\nStart site v2",
      done: "Mora round 1 delivered\nNorthwind kicked off",
      not_done: "Site v2 — not started",
      reasons: "Client work took priority.",
      wins: "Northwind signed a 3-month retainer.",
      problems: "Kestrel access delays.",
      lessons: "Ask for client system access at kickoff.",
      next_period: "Finish Northwind finals\nUnblock Kestrel",
      numbers: "",
      created_by: alex!.id,
      updated_by: alex!.id,
      created_at: ago(5),
      updated_at: ago(5),
    },
  ];

  s.kb_pages = DEFAULT_KB_PAGES.map((p, i) => ({
    id: uid(),
    slug: p.slug,
    title: p.title,
    icon: p.icon,
    content_md: p.content_md,
    sort_order: i,
    updated_by: alex!.id,
    created_at: now,
    updated_at: now,
  }));

  s.finance_sources = [
    {
      id: uid(),
      name: "Demo finance sheet",
      kind: "demo",
      url: null,
      mapping: DEMO_MAPPING,
      last_synced_at: null,
      created_at: now,
      updated_at: now,
    },
  ];

  const act = (
    actor: string,
    action: string,
    entity_type: Snapshot["activity_log"][number]["entity_type"],
    entity_id: string,
    entity_label: string,
    project_id: string | null,
    hoursAgo: number,
    meta: Record<string, unknown> = {},
  ) => ({
    id: uid(),
    actor_id: actor,
    action,
    entity_type,
    entity_id,
    entity_label,
    project_id,
    meta,
    created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    updated_at: now,
  });
  const tk = (title: string) => s.tasks.find((x) => x.title === title)!;
  s.activity_log = [
    act(sam!.id, "status_changed", "task", tk("Homepage wireframes").id, "Homepage wireframes", kestrel.id, 2, { from: "in_progress", to: "review" }),
    act(jordan!.id, "status_changed", "project", kestrel.id, kestrel.name, kestrel.id, 5, { from: "active", to: "blocked" }),
    act(sam!.id, "completed", "task", tk("Choose site framework").id, "Choose site framework", site.id, 26),
    act(alex!.id, "created", "calendar_note", s.calendar_notes[0]!.id, "Northwind check-in", null, 48, { date: s.calendar_notes[0]!.date }),
    act(alex!.id, "added", "library_item", s.library_items[3]!.id, s.library_items[3]!.name, northwind.id, 60),
    act(sam!.id, "completed", "project", typeface.id, typeface.name, typeface.id, 24 * 12),
  ];

  s.settings = [
    { id: uid(), key: "workspace", value: { name: "Studio Spot", currency: "EUR", week_starts_on: 1 }, ...stamp },
    {
      id: uid(),
      key: "tags",
      value: {
        project: [
          { name: "branding", color: "orange" },
          { name: "web", color: "blue" },
          { name: "packaging", color: "brown" },
          { name: "print", color: "purple" },
          { name: "retainer", color: "green" },
          { name: "internal", color: "gray" },
        ],
        library: [
          { name: "brand", color: "orange" },
          { name: "template", color: "purple" },
          { name: "finance", color: "green" },
          { name: "legal", color: "red" },
          { name: "client", color: "blue" },
        ],
      },
      ...stamp,
    },
  ];
  return s;
}
