"use client";

import { useRef, useState } from "react";
import { Download, File, FileImage, FileType2, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@/directions/d2/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { getAdapter } from "@/directions/d2/lib/data";
import { cn, formatBytes, timeAgo } from "@/directions/d2/lib/utils";
import { Button, IconButton } from "@/directions/d2/components/ui/button";
import { EmptyState } from "@/directions/d2/components/ui/misc";

type Owner = { note_id?: string; project_id?: string; review_id?: string };

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
  if (mime.startsWith("image/")) return <FileImage className="size-4" />;
  if (mime === "application/pdf") return <FileType2 className="size-4" />;
  return <File className="size-4" />;
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
      className={cn("rounded-[22px] transition-colors", dragging && "bg-[var(--chunk-soft-2)] outline-dashed outline-2 outline-current/30")}
    >
      {items.length === 0 && !compact ? (
        <EmptyState
          icon={<Paperclip className="size-5" />}
          title="No files yet"
          description="Drop files here or upload. Large deliverables belong in Google Drive — add those as Links."
          action={
            <Button variant="primary" onClick={() => input.current?.click()} disabled={busy}>
              <Upload className="size-3.5" /> {busy ? "Uploading…" : "Upload a file"}
            </Button>
          }
        />
      ) : (
        <>
          {items.map((a) => (
            <div key={a.id} className="group mb-2 flex min-h-12 items-center gap-3 rounded-[22px] bg-[var(--chunk-soft)] py-1.5 pl-1.5 pr-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--chunk-soft)]">
                <FileIcon mime={a.mime_type} />
              </span>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[14px] hover:underline">
                {a.name}
              </a>
              {!compact && (
                <span className="hidden shrink-0 text-[12px] opacity-50 sm:inline">
                  {people.get(a.created_by)?.full_name ?? ""} · {timeAgo(a.created_at)}
                </span>
              )}
              <span className="shrink-0 text-[12px] opacity-50 tabular">{formatBytes(a.size)}</span>
              <a href={a.url} download={a.name} className="hidden size-8 items-center justify-center rounded-full opacity-60 hover:bg-[var(--chunk-soft)] hover:opacity-100 group-hover:flex" title="Download">
                <Download className="size-3.5" />
              </a>
              <IconButton
                label="Delete file"
                className="hidden text-current opacity-60 hover:bg-[var(--chunk-soft)] hover:opacity-100 group-hover:flex"
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
            className="flex h-11 w-full items-center gap-2 rounded-full px-3 text-[14px] opacity-60 transition-[opacity,background] hover:bg-[var(--chunk-soft)] hover:opacity-100"
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
