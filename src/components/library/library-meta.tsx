import { File, FileSpreadsheet, FileText, Folder, Globe, LayoutTemplate, Presentation, FileType2 } from "lucide-react";
import type { LibraryItemType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Guess a Library type from a pasted URL (Drive, Docs, Sheets, Slides, PDF). */
export function detectLibraryType(url: string): LibraryItemType {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/document")) return "google_doc";
  if (u.includes("docs.google.com/spreadsheets")) return "google_sheet";
  if (u.includes("docs.google.com/presentation")) return "google_slides";
  if (u.includes("drive.google.com/drive/folders") || u.includes("drive.google.com/drive/u/")) return "drive_folder";
  if (u.includes("drive.google.com/file")) return "drive_file";
  if (/\.pdf($|\?|#)/.test(u)) return "pdf";
  return "url";
}

export function guessNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    if (last && !/^[a-zA-Z0-9_-]{20,}$/.test(last) && last !== "edit" && last !== "view") return last.replace(/[-_]+/g, " ");
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const ICON: Record<LibraryItemType, { Icon: typeof File; color: string }> = {
  google_doc: { Icon: FileText, color: "text-[#4285f4]" },
  google_sheet: { Icon: FileSpreadsheet, color: "text-[#0f9d58]" },
  google_slides: { Icon: Presentation, color: "text-[#f4b400]" },
  drive_folder: { Icon: Folder, color: "text-fg-2" },
  drive_file: { Icon: File, color: "text-fg-2" },
  pdf: { Icon: FileType2, color: "text-[#e03e3e]" },
  template: { Icon: LayoutTemplate, color: "text-[var(--dot-purple)]" },
  url: { Icon: Globe, color: "text-fg-2" },
};

/** `plain` drops the brand colour so the icon takes the colour of the card it sits on. */
export function LibraryIcon({ type, className, plain = false }: { type: LibraryItemType; className?: string; plain?: boolean }) {
  const { Icon, color } = ICON[type] ?? ICON.url;
  return <Icon className={cn("size-4 shrink-0", !plain && color, className)} strokeWidth={1.8} />;
}

/** Plain, short names — singular for a chip, plural for the filter pills. */
export const LIBRARY_TYPE_NAME: Record<LibraryItemType, { one: string; many: string }> = {
  google_doc: { one: "Doc", many: "Docs" },
  google_sheet: { one: "Sheet", many: "Sheets" },
  google_slides: { one: "Slides", many: "Slides" },
  drive_folder: { one: "Folder", many: "Folders" },
  drive_file: { one: "File", many: "Files" },
  pdf: { one: "PDF", many: "PDFs" },
  template: { one: "Template", many: "Templates" },
  url: { one: "Link", many: "Links" },
};

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
