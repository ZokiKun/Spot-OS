"use client";

import { useRef, useState } from "react";
import { Download, File, FileImage, FileType2, Link2, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { getAdapter } from "@/lib/data";
import { cn, formatBytes, timeAgo } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

type Owner = { note_id?: string; project_id?: string; review_id?: string; kb_page_id?: string; task_id?: string };

/** Links (Google Drive, Dropbox…) are attachment rows with this mime type and no stored file. */
export const LINK_MIME = "text/uri-list";
export const isLink = (a: Attachment) => a.mime_type === LINK_MIME;

/** Notes and tasks keep one small file; anything bigger goes in Google Drive as a link. */
export const NOTE_FILE_LIMIT = { maxFiles: 1, maxBytes: 500 * 1024, links: true } as const;

const ownerFields = (owner: Owner) => ({
  note_id: owner.note_id ?? null,
  project_id: owner.project_id ?? null,
  review_id: owner.review_id ?? null,
  kb_page_id: owner.kb_page_id ?? null,
  task_id: owner.task_id ?? null,
});

/** "https://drive.google.com/file/d/…" → "Google Drive"; unknown hosts show the host name. */
export function linkLabel(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "docs.google.com") {
      if (u.pathname.startsWith("/spreadsheets")) return "Google Sheet";
      if (u.pathname.startsWith("/presentation")) return "Google Slides";
      if (u.pathname.startsWith("/forms")) return "Google Form";
      return "Google Doc";
    }
    const known: Record<string, string> = {
      "drive.google.com": "Google Drive",
      "dropbox.com": "Dropbox",
      "figma.com": "Figma",
      "notion.so": "Notion",
      "wetransfer.com": "WeTransfer",
      "we.tl": "WeTransfer",
      "frame.io": "Frame.io",
      "f.io": "Frame.io",
      "vimeo.com": "Vimeo",
      "youtube.com": "YouTube",
      "youtu.be": "YouTube",
      "onedrive.live.com": "OneDrive",
      "box.com": "Box",
      "miro.com": "Miro",
    };
    return known[host] ?? host;
  } catch {
    return url;
  }
}

/** Accepts "drive.google.com/…" without a scheme; returns null for anything that isn't a web link. */
function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(/^[a-z][\w+.-]*:/i.test(v) ? v : `https://${v}`);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function useAttachmentUpload(owner: Owner, folder: string, limits: { maxBytes?: number; slots?: number } = {}) {
  const { upload, create, me } = useWorkspace();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (picked: FileList | File[]) => {
    let files = Array.from(picked);
    const { maxBytes, slots } = limits;
    if (maxBytes && files.some((f) => f.size > maxBytes)) {
      toast.show({
        title: `Files must be ${formatBytes(maxBytes)} or smaller`,
        description: "For bigger files, upload to Google Drive and add the link instead.",
        tone: "error",
      });
      files = files.filter((f) => f.size <= maxBytes);
    }
    if (slots != null && files.length > slots) {
      if (slots <= 0 || files.length > 1)
        toast.show({
          title: slots <= 0 ? "There's already a file here" : `Only ${slots} file${slots === 1 ? "" : "s"} can be added here`,
          description: "Remove it to attach another, or add a link to Google Drive instead.",
          tone: "error",
        });
      files = files.slice(0, Math.max(slots, 0));
    }
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const { path, url } = await upload(file, folder);
        await create("attachments", {
          ...ownerFields(owner),
          name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
          storage_path: path,
          url,
          created_by: me?.id ?? null,
        });
      }
    } catch {
      /* toast shown by store */
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

function FileIcon({ mime }: { mime: string }) {
  if (mime === LINK_MIME) return <Link2 className="size-4 text-accent" />;
  if (mime.startsWith("image/")) return <FileImage className="size-4 text-fg-2" />;
  if (mime === "application/pdf") return <FileType2 className="size-4 text-[#e03e3e]" />;
  return <File className="size-4 text-fg-2" />;
}

/**
 * Files (and optionally links) on a project, note, task…
 * `maxFiles` / `maxBytes` cap uploads; `links` adds an "Add a link" row for Google Drive and friends.
 */
export function AttachmentList({
  items,
  owner,
  folder,
  compact = false,
  maxFiles,
  maxBytes,
  links = false,
}: {
  items: Attachment[];
  owner: Owner;
  folder: string;
  compact?: boolean;
  maxFiles?: number;
  maxBytes?: number;
  links?: boolean;
}) {
  const { remove, create, me } = useWorkspace();
  const ask = useConfirm();
  const people = useProfiles();
  const toast = useToast();
  const fileCount = items.filter((a) => !isLink(a)).length;
  const slots = maxFiles == null ? undefined : maxFiles - fileCount;
  const { run, busy } = useAttachmentUpload(owner, folder, { maxBytes, slots });
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const canAttach = slots == null || slots > 0;
  const limitHint = [maxFiles === 1 ? "1 file" : maxFiles ? `${maxFiles} files` : "", maxBytes ? `max ${formatBytes(maxBytes)}` : ""].filter(Boolean).join(", ");

  const addLink = async () => {
    const url = normalizeUrl(linkDraft ?? "");
    if (!url) {
      toast.show({ title: "That doesn't look like a link", description: "Paste a full web address, e.g. a Google Drive share link.", tone: "error" });
      return;
    }
    setLinkDraft(null);
    await create("attachments", {
      ...ownerFields(owner),
      name: linkLabel(url),
      mime_type: LINK_MIME,
      size: 0,
      storage_path: "",
      url,
      created_by: me?.id ?? null,
    });
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void run(e.dataTransfer.files);
      }}
      className={cn("rounded-md transition-colors", dragging && "bg-accent-soft")}
    >
      {items.length === 0 && !compact ? (
        <EmptyState
          icon={<Paperclip className="size-5" />}
          title="No files yet"
          description="Drop files here or upload. Large deliverables belong in Google Drive — add those as Links."
          action={
            <Button onClick={() => input.current?.click()} disabled={busy}>
              <Upload className="size-3.5" /> {busy ? "Uploading…" : "Upload"}
            </Button>
          }
        />
      ) : (
        <>
          {items.map((a) => {
            const link = isLink(a);
            return (
              <div key={a.id} className="group flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
                <FileIcon mime={a.mime_type} />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-baseline gap-2 text-[14px] hover:underline" title={a.url}>
                  <span className={link ? "shrink-0" : "truncate"}>{a.name}</span>
                  {link && <span className="min-w-0 truncate text-[12px] text-fg-3">{a.url.replace(/^https?:\/\/(www\.)?/, "")}</span>}
                </a>
                {!compact && (
                  <span className="hidden shrink-0 text-[12px] text-fg-3 sm:inline">
                    {people.get(a.created_by)?.full_name ?? ""} · {timeAgo(a.created_at)}
                  </span>
                )}
                {!link && <span className="shrink-0 text-[12px] text-fg-3 tabular">{formatBytes(a.size)}</span>}
                {!link && (
                  <a href={a.url} download={a.name} className="hidden size-6 items-center justify-center rounded-md text-fg-2 hover:bg-hover group-hover:flex" title="Download">
                    <Download className="size-3.5" />
                  </a>
                )}
                <IconButton
                  label={link ? "Remove link" : "Delete file"}
                  className="hidden group-hover:flex"
                  onClick={() => {
                    void ask({ title: link ? `Remove this ${a.name} link?` : `Delete ${a.name}?`, confirmLabel: link ? "Remove" : "Delete" }).then((ok) => {
                      if (!ok) return;
                      void remove("attachments", a.id);
                      if (a.storage_path) void getAdapter().removeFile(a.storage_path);
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            );
          })}
          {linkDraft != null && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void addLink();
              }}
              className="flex h-9 items-center gap-2.5 px-2"
            >
              <Link2 className="size-4 shrink-0 text-fg-3" />
              <input
                autoFocus
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setLinkDraft(null)}
                onBlur={() => !linkDraft.trim() && setLinkDraft(null)}
                placeholder="Paste a Google Drive, Dropbox or Figma link…"
                className="h-8 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-3"
              />
              <Button type="submit" size="sm" variant="primary" disabled={!linkDraft.trim()}>
                Add
              </Button>
            </form>
          )}
          <div className="flex flex-wrap items-center gap-x-1">
            {canAttach ? (
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={busy}
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2"
              >
                <Paperclip className="size-4" /> {busy ? "Uploading…" : "Attach a file"}
                {limitHint && !busy && <span className="text-[12px] text-fg-3">({limitHint})</span>}
              </button>
            ) : (
              <span className="flex h-8 items-center gap-1.5 px-2 text-[13px] text-fg-3">
                <Paperclip className="size-4" /> File limit reached — add bigger files as links
              </span>
            )}
            {links && linkDraft == null && (
              <button
                type="button"
                onClick={() => setLinkDraft("")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2"
              >
                <Link2 className="size-4" /> Add a link
              </button>
            )}
          </div>
        </>
      )}
      <input
        ref={input}
        type="file"
        multiple={maxFiles == null || maxFiles > 1}
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void run(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
