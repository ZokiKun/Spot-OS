// Entity types — mirror supabase/migrations/0001_init.sql one-to-one.

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export type ProjectType = "client" | "in_house" | "studio" | "personal";
export type ProjectStatus = "backlog" | "active" | "blocked" | "review" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type LibraryItemType =
  | "google_doc"
  | "google_sheet"
  | "google_slides"
  | "drive_folder"
  | "drive_file"
  | "pdf"
  | "template"
  | "url";
export type ReviewPeriod = "month" | "quarter";
export type ThemePref = "system" | "light" | "dark";

export interface Profile {
  id: UUID;
  full_name: string;
  email: string;
  role_title: string | null;
  color: string; // tag colour key
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Project {
  id: UUID;
  name: string;
  icon: string | null; // emoji
  type: ProjectType;
  status: ProjectStatus;
  client: string | null;
  client_contact: string | null;
  creative_director_id: UUID | null;
  lead_id: UUID | null;
  start_date: ISODate | null;
  deadline: ISODate | null;
  description: string | null;
  next_action: string | null;
  /** Short note shown in the projects table (supports @mentions). */
  note: string | null;
  /** Custom tags — names; colours live in the "tags" workspace setting. */
  tags: string[];
  notes_html: string | null;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  completed_at: ISODateTime | null;
}

export interface ProjectMember {
  id: UUID;
  project_id: UUID;
  profile_id: UUID;
  role: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Task {
  id: UUID;
  project_id: UUID | null;
  title: string;
  description: string | null;
  assignee_id: UUID | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: ISODate | null;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  completed_at: ISODateTime | null;
}

export interface CalendarNote {
  id: UUID;
  date: ISODate;
  title: string;
  content_html: string;
  created_by: UUID | null;
  updated_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Native Spot OS upload (Supabase Storage). Exactly one owner FK is set. */
export interface Attachment {
  id: UUID;
  note_id: UUID | null;
  project_id: UUID | null;
  review_id: UUID | null;
  kb_page_id: UUID | null; // Spot Base brand assets (logo, files)
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  url: string;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Library entry. Replaces separate links / documents / project_links tables. */
export interface LibraryItem {
  id: UUID;
  name: string;
  type: LibraryItemType;
  url: string;
  project_id: UUID | null;
  tags: string[];
  description: string | null;
  /** Pinned for everyone. */
  pinned: boolean;
  /** Members who pinned it for themselves. */
  pinned_by: UUID[];
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Monthly and quarterly reviews share one table. */
export interface Review {
  id: UUID;
  period: ReviewPeriod;
  period_start: ISODate; // first day of month / quarter
  planned: string;
  done: string;
  not_done: string;
  reasons: string;
  wins: string;
  problems: string;
  lessons: string;
  next_period: string;
  numbers: string;
  created_by: UUID | null;
  updated_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ActivityEntry {
  id: UUID;
  actor_id: UUID | null;
  action: string; // e.g. "created", "completed", "status_changed"
  entity_type: "project" | "task" | "calendar_note" | "library_item" | "review" | "kb_page";
  entity_id: UUID;
  entity_label: string;
  project_id: UUID | null;
  meta: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** In-app notification, e.g. "Sam mentioned you in Northwind rebrand". */
export interface Notification {
  id: UUID;
  recipient_id: UUID;
  actor_id: UUID | null;
  kind: "mention";
  entity_type: "project" | "task" | "calendar_note" | "kb_page";
  entity_id: UUID;
  entity_label: string;
  href: string;
  excerpt: string;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface KbPage {
  id: UUID;
  slug: string;
  title: string;
  icon: string | null;
  content_md: string;
  sort_order: number;
  updated_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Column mapping that turns an arbitrary spreadsheet into normalized entries. */
export interface FinanceMapping {
  /** Header names, matched case-insensitively. */
  date: string;
  /** Single signed amount column, OR use income/expense columns. */
  amount?: string;
  type?: string; // column whose value says income/expense
  income_values?: string[];
  expense_values?: string[];
  income?: string; // separate income column
  expense?: string; // separate expense column
  category?: string;
  description?: string;
  status?: string; // e.g. "Paid" / "Outstanding"
  outstanding_values?: string[];
  /** Balance column — last non-empty value is "current available". */
  balance?: string;
  opening_balance?: number;
  date_format?: "auto" | "dmy" | "mdy" | "ymd";
  currency?: string;
}

export interface FinanceSource {
  id: UUID;
  name: string;
  kind: "google_sheet_csv" | "demo";
  url: string | null;
  mapping: FinanceMapping;
  last_synced_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface FinanceEntry {
  date: ISODate;
  amount: number; // positive income, negative expense
  category: string | null;
  description: string | null;
  outstanding: boolean;
}

export interface FinanceSnapshot {
  id: UUID;
  source_id: UUID;
  entries: FinanceEntry[];
  balance: number | null;
  fetched_at: ISODateTime;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface WorkspaceSettings {
  id: UUID;
  key: string;
  value: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Tables {
  profiles: Profile;
  projects: Project;
  project_members: ProjectMember;
  tasks: Task;
  calendar_notes: CalendarNote;
  attachments: Attachment;
  library_items: LibraryItem;
  reviews: Review;
  activity_log: ActivityEntry;
  kb_pages: KbPage;
  finance_sources: FinanceSource;
  finance_snapshots: FinanceSnapshot;
  settings: WorkspaceSettings;
  notifications: Notification;
}

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T];

export const TABLE_NAMES: TableName[] = [
  "profiles",
  "projects",
  "project_members",
  "tasks",
  "calendar_notes",
  "attachments",
  "library_items",
  "reviews",
  "activity_log",
  "kb_pages",
  "finance_sources",
  "finance_snapshots",
  "settings",
  "notifications",
];

export type Snapshot = { [K in TableName]: Tables[K][] };

export type Change =
  | { type: "upsert"; table: TableName; row: Tables[TableName] }
  | { type: "delete"; table: TableName; id: UUID };
