"use client";

import { useEffect, useRef } from "react";
import { Download, Ellipsis, FileCode, Printer, Trash2 } from "lucide-react";
import type { CalendarNote } from "@/directions/d2/lib/types";
import { useProfiles, useWorkspace } from "@/directions/d2/lib/store";
import { useDebouncedSave } from "@/directions/d2/lib/hooks";
import { htmlToMarkdown } from "@/directions/d2/lib/markdown";
import { downloadFile, formatLongDate, slugify, timeAgo } from "@/directions/d2/lib/utils";
import { EditableText } from "@/directions/d2/components/ui/input";
import { IconButton } from "@/directions/d2/components/ui/button";
import { Popover, usePopover } from "@/directions/d2/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/directions/d2/components/ui/menu";
import { RichEditor } from "@/directions/d2/components/editor/rich-editor";
import { AttachmentList } from "@/directions/d2/components/attachments";

function exportHtml(note: CalendarNote) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${note.title || note.date}</title>
<style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#32302c;max-width:720px;margin:48px auto;padding:0 24px}h1,h2,h3{line-height:1.3}img{max-width:100%}.meta{color:#787774;font-size:14px}ul[data-type=taskList]{list-style:none;padding-left:0}ul[data-type=taskList] li{display:flex;gap:8px}</style>
</head><body><p class="meta">${formatLongDate(note.date)}</p><h1>${note.title || "Untitled"}</h1>${note.content_html}</body></html>`;
}

export function NoteCard({ note, focus }: { note: CalendarNote; focus?: boolean }) {
  const { data, update, remove, upload, me } = useWorkspace();
  const people = useProfiles();
  const { setAnchor: menuAnchorRef, ...menu } = usePopover();
  const ref = useRef<HTMLDivElement>(null);
  const attachments = data.attachments.filter((a) => a.note_id === note.id);
  const { schedule } = useDebouncedSave<string>((content_html) =>
    void update("calendar_notes", note.id, { content_html, updated_by: me?.id ?? null }),
  );
  const filename = `${note.date}-${slugify(note.title || "note")}`;

  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  return (
    <article ref={ref} className="scroll-mt-24 rounded-[28px] bg-cream p-6 text-on-chunk [--check-stroke:#f7f3ea] [&_.prose-notion]:text-current sm:p-7">
      <div className="flex items-start gap-2">
        <EditableText
          value={note.title}
          onCommit={(title) => void update("calendar_notes", note.id, { title, updated_by: me?.id ?? null })}
          placeholder="Give it a title"
          className="text-[24px] font-medium leading-tight tracking-[-0.02em] placeholder:text-[var(--on-chunk-2)]"
        />
        <IconButton ref={menuAnchorRef} label="Note options" size="md" onClick={menu.toggle} className="-mr-2 -mt-1 bg-[var(--chunk-soft)] text-current hover:bg-[var(--chunk-soft-2)]">
          <Ellipsis className="size-4" />
        </IconButton>
        <Popover open={menu.open} onClose={menu.close} anchor={menu.anchor} align="end" width={220}>
          <MenuList>
            <MenuItem
              icon={<Download className="size-4" />}
              onSelect={() => {
                downloadFile(`${filename}.md`, `# ${note.title || "Untitled"}\n\n_${formatLongDate(note.date)}_\n\n${htmlToMarkdown(note.content_html)}\n`, "text/markdown");
                menu.close();
              }}
            >
              Export as Markdown
            </MenuItem>
            <MenuItem
              icon={<FileCode className="size-4" />}
              onSelect={() => {
                downloadFile(`${filename}.html`, exportHtml(note), "text/html");
                menu.close();
              }}
            >
              Export as HTML
            </MenuItem>
            <MenuItem
              icon={<Printer className="size-4" />}
              onSelect={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(exportHtml(note));
                  w.document.close();
                  w.onload = () => w.print();
                }
                menu.close();
              }}
            >
              Print / Save as PDF
            </MenuItem>
            <MenuDivider />
            <MenuItem
              danger
              icon={<Trash2 className="size-4" />}
              onSelect={() => {
                if (confirm(`Delete “${note.title || "Untitled"}”?`)) void remove("calendar_notes", note.id);
              }}
            >
              Delete note
            </MenuItem>
          </MenuList>
        </Popover>
      </div>
      <div className="mb-4 mt-1 text-[12.5px] text-[var(--on-chunk-2)]">
        {people.get(note.created_by)?.full_name ?? "Someone"}
        {note.updated_by && note.updated_at !== note.created_at && (
          <> · edited by {people.get(note.updated_by)?.full_name ?? "someone"} {timeAgo(note.updated_at)}</>
        )}
      </div>
      <RichEditor
        value={note.content_html}
        onChange={schedule}
        onUploadImage={async (file) => (await upload(file, `calendar/${note.date}`)).url}
        placeholder="What happened? What should we remember?"
        className="min-h-[96px]"
      />
      <div className="mt-3">
        <AttachmentList items={attachments} owner={{ note_id: note.id }} folder={`calendar/${note.date}`} compact />
      </div>
    </article>
  );
}
