import { File, FileSpreadsheet, FileText, Folder, Globe, LayoutTemplate, Presentation, FileType2 } from "lucide-react";
import type { LibraryItemType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconTile, type Tone } from "@/components/ui/misc";

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

const ICON: Record<LibraryItemType, { Icon: typeof File; color: string; tone: Tone }> = {
  google_doc: { Icon: FileText, color: "text-blue", tone: "blue" },
  google_sheet: { Icon: FileSpreadsheet, color: "text-green", tone: "green" },
  google_slides: { Icon: Presentation, color: "text-yellow-edge", tone: "yellow" },
  drive_folder: { Icon: Folder, color: "text-fg-2", tone: "gray" },
  drive_file: { Icon: File, color: "text-fg-2", tone: "gray" },
  pdf: { Icon: FileType2, color: "text-red", tone: "red" },
  template: { Icon: LayoutTemplate, color: "text-purple", tone: "purple" },
  url: { Icon: Globe, color: "text-orange", tone: "orange" },
};

export function LibraryIcon({ type, className }: { type: LibraryItemType; className?: string }) {
  const { Icon, color } = ICON[type] ?? ICON.url;
  return <Icon className={cn("size-4 shrink-0", color, className)} strokeWidth={2.5} />;
}

/** Big tinted tile version for cards. */
export function LibraryTile({ type, size = 48 }: { type: LibraryItemType; size?: number }) {
  const { Icon, tone } = ICON[type] ?? ICON.url;
  return (
    <IconTile tone={tone} size={size}>
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.5} />
    </IconTile>
  );
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
