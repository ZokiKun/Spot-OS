"use client";

import { useRef, useState } from "react";
import { Download, File, FileImage, FileType2, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@/directions/d3/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d3/lib/store";
import { getAdapter } from "@/directions/d3/lib/data";
import { cn, formatBytes, timeAgo } from "@/directions/d3/lib/utils";
import { Button, IconButton } from "@/directions/d3/components/ui/button";
import { Card, EmptyState, IconTile } from "@/directions/d3/components/ui/misc";

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
  if (mime.startsWith("image/"))
    return (
      <IconTile tone="blue" size={36}>
        <FileImage className="size-[18px]" strokeWidth={2.5} />
      </IconTile>
    );
  if (mime === "application/pdf")
    return (
      <IconTile tone="red" size={36}>
        <FileType2 className="size-[18px]" strokeWidth={2.5} />
      </IconTile>
    );
  return (
    <IconTile tone="gray" size={36}>
      <File className="size-[18px]" strokeWidth={2.5} />
    </IconTile>
  );
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
      className={cn("rounded-2xl transition-colors", dragging && "bg-accent-soft outline-2 outline-dashed outline-blue")}
    >
      {items.length === 0 && !compact ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<Paperclip className="size-7" strokeWidth={2.5} />}
            title="No files yet"
            description="Drop files here or upload. Big deliverables belong in Google Drive — add those as links."
            action={
              <Button onClick={() => input.current?.click()} disabled={busy}>
                <Upload className="size-4" strokeWidth={3} /> {busy ? "Uploading…" : "Upload"}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {items.map((a) => (
            <div key={a.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-hover">
              <FileIcon mime={a.mime_type} />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[15px] font-bold hover:text-blue">
                {a.name}
              </a>
              {!compact && (
                <span className="hidden shrink-0 text-[12.5px] font-semibold text-fg-3 sm:inline">
                  {people.get(a.created_by)?.full_name ?? ""} · {timeAgo(a.created_at)}
                </span>
              )}
              <span className="shrink-0 text-[12.5px] font-bold text-fg-3 tabular">{formatBytes(a.size)}</span>
              <a href={a.url} download={a.name} className="hidden size-8 items-center justify-center rounded-xl text-fg-2 hover:bg-active group-hover:flex" title="Download">
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
            className="label-caps mt-1 flex h-10 items-center gap-2 rounded-xl px-2 text-[12.5px] text-blue hover:bg-hover"
          >
            <Paperclip className="size-4" strokeWidth={3} /> {busy ? "Uploading…" : "Attach a file"}
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
