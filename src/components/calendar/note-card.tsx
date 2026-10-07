"use client";

import { useEffect, useRef } from "react";
import { Download, Ellipsis, FileCode, Printer, Trash2 } from "lucide-react";
import type { CalendarNote } from "@/lib/types";
import { useProfiles, useWorkspace } from "@/lib/store";
import { useDebouncedSave } from "@/lib/hooks";
import { htmlToMarkdown } from "@/lib/markdown";
import { downloadFile, formatLongDate, slugify, timeAgo } from "@/lib/utils";
import { EditableText } from "@/components/ui/input";
import { IconButton } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";
import { MenuDivider, MenuItem, MenuList } from "@/components/ui/menu";
import { RichEditor } from "@/components/editor/rich-editor";
import { AttachmentList } from "@/components/attachments";

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
    <article ref={ref} className="scroll-mt-20 rounded-2xl border-2 border-line bg-bg px-5 pb-5 pt-4">
      <div className="flex items-start gap-2">
        <EditableText
          value={note.title}
          onCommit={(title) => void update("calendar_notes", note.id, { title, updated_by: me?.id ?? null })}
          placeholder="Give it a title"
          className="text-[20px] font-extrabold leading-tight placeholder:text-fg-3"
        />
        <IconButton ref={menuAnchorRef} label="Note options" onClick={menu.toggle} className="-mt-0.5">
          <Ellipsis className="size-5" strokeWidth={3} />
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
      <div className="mb-3 mt-0.5 text-[12.5px] font-bold text-fg-3">
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
      <div className="mt-3 border-t-2 border-line pt-2">
        <AttachmentList items={attachments} owner={{ note_id: note.id }} folder={`calendar/${note.date}`} compact />
      </div>
    </article>
  );
}
