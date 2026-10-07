"use client";

import { useRef, useState } from "react";
import { Download, File, FileImage, FileType2, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { getAdapter } from "@/lib/data";
import { cn, formatBytes, timeAgo } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

type Owner = { note_id?: string; project_id?: string; review_id?: string; kb_page_id?: string };

export function useAttachmentUpload(owner: Owner, folder: string) {
  const { upload, create, me } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const run = async (files: FileList | File[]) => {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const { path, url } = await upload(file, folder);
        await create("attachments", {
          note_id: owner.note_id ?? null,
          project_id: owner.project_id ?? null,
          review_id: owner.review_id ?? null,
          kb_page_id: owner.kb_page_id ?? null,
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
  if (mime.startsWith("image/")) return <FileImage className="size-4 text-fg-2" />;
  if (mime === "application/pdf") return <FileType2 className="size-4 text-[#e03e3e]" />;
  return <File className="size-4 text-fg-2" />;
}

export function AttachmentList({ items, owner, folder, compact = false }: { items: Attachment[]; owner: Owner; folder: string; compact?: boolean }) {
  const { remove } = useWorkspace();
  const people = useProfiles();
  const { run, busy } = useAttachmentUpload(owner, folder);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
          {items.map((a) => (
            <div key={a.id} className="group flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
              <FileIcon mime={a.mime_type} />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[14px] hover:underline">
                {a.name}
              </a>
              {!compact && (
                <span className="hidden shrink-0 text-[12px] text-fg-3 sm:inline">
                  {people.get(a.created_by)?.full_name ?? ""} · {timeAgo(a.created_at)}
                </span>
              )}
              <span className="shrink-0 text-[12px] text-fg-3 tabular">{formatBytes(a.size)}</span>
              <a href={a.url} download={a.name} className="hidden size-6 items-center justify-center rounded-md text-fg-2 hover:bg-hover group-hover:flex" title="Download">
                <Download className="size-3.5" />
              </a>
              <IconButton
                label="Delete file"
                className="hidden group-hover:flex"
                onClick={() => {
                  if (!confirm(`Delete ${a.name}?`)) return;
                  void remove("attachments", a.id);
                  void getAdapter().removeFile(a.storage_path);
                }}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[14px] text-fg-3 hover:bg-hover hover:text-fg-2"
          >
            <Paperclip className="size-4" /> {busy ? "Uploading…" : "Attach a file"}
          </button>
        </>
      )}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void run(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
