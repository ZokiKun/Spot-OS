import type {
  LibraryItemType,
  ProjectStatus,
  ProjectType,
  TaskPriority,
  TaskStatus,
} from "./types";

export type TagColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface Option<T extends string> {
  value: T;
  label: string;
  color: TagColor;
}

export const PROJECT_STATUSES: Option<ProjectStatus>[] = [
  { value: "backlog", label: "Backlog", color: "default" },
  { value: "active", label: "Active", color: "blue" },
  { value: "blocked", label: "Blocked", color: "red" },
  { value: "review", label: "Review", color: "purple" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "archived", label: "Archived", color: "gray" },
];

export const PROJECT_TYPES: Option<ProjectType>[] = [
  { value: "client", label: "Client", color: "orange" },
  { value: "in_house", label: "In-house", color: "blue" },
  { value: "studio", label: "Studio", color: "brown" },
  { value: "personal", label: "Personal", color: "pink" },
];

export const TASK_STATUSES: Option<TaskStatus>[] = [
  { value: "todo", label: "Todo", color: "default" },
  { value: "in_progress", label: "In Progress", color: "blue" },
  { value: "blocked", label: "Blocked", color: "red" },
  { value: "review", label: "Review", color: "purple" },
  { value: "done", label: "Done", color: "green" },
];

export const TASK_PRIORITIES: Option<TaskPriority>[] = [
  { value: "low", label: "Low", color: "gray" },
  { value: "medium", label: "Medium", color: "yellow" },
  { value: "high", label: "High", color: "orange" },
  { value: "urgent", label: "Urgent", color: "red" },
];

export const LIBRARY_TYPES: (Option<LibraryItemType> & { icon: string })[] = [
  { value: "google_doc", label: "Google Doc", color: "blue", icon: "doc" },
  { value: "google_sheet", label: "Google Sheet", color: "green", icon: "sheet" },
  { value: "google_slides", label: "Google Slides", color: "yellow", icon: "slides" },
  { value: "drive_folder", label: "Drive folder", color: "gray", icon: "folder" },
  { value: "drive_file", label: "Drive file", color: "gray", icon: "file" },
  { value: "pdf", label: "PDF", color: "red", icon: "pdf" },
  { value: "template", label: "Template", color: "purple", icon: "template" },
  { value: "url", label: "Link", color: "default", icon: "link" },
];

export const MEMBER_COLORS: TagColor[] = ["orange", "blue", "green", "purple", "pink", "brown", "yellow", "red"];

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ["active", "blocked", "review"];
export const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "review"];

export function optionFor<T extends string>(options: Option<T>[], value: T | null | undefined) {
  return options.find((o) => o.value === value);
}

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/reviews", label: "Reviews", icon: "reviews" },
  { href: "/activity", label: "Activity", icon: "activity" },
] as const;
