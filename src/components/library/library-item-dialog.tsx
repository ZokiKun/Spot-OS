"use client";

import { useState } from "react";
import { ChevronDown, Link2, Trash2 } from "lucide-react";
import type { LibraryItem, LibraryItemType } from "@/lib/types";
import { LIBRARY_TYPES, LIBRARY_TYPE_TONE } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PillButton, TONE, isColor } from "@/components/ui/chunk";
import { TextInput } from "@/components/ui/input";
import { ProjectField } from "@/components/ui/fields";
import { MenuItem, MenuList } from "@/components/ui/menu";
import { Popover, usePopover } from "@/components/ui/popover";
import { LIBRARY_TYPE_NAME, LibraryIcon, detectLibraryType, guessNameFromUrl } from "./library-meta";
import { GooglePickerButton } from "./google-picker";

/** Create or edit a Library item. Project links are Library items with project_id set. */
export function LibraryItemDialog({
  open,
  onClose,
  item,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  item?: LibraryItem | null;
  defaults?: Partial<LibraryItem>;
}) {
  const { data, create, update, remove, me } = useWorkspace();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<LibraryItemType>("url");
  const [typeTouched, setTypeTouched] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [more, setMore] = useState(false);
  const { setAnchor: typeAnchor, ...typePop } = usePopover();

  // Re-initialise the form each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setUrl(item?.url ?? "");
      setName(item?.name ?? "");
      setType(item?.type ?? defaults?.type ?? "url");
      setTypeTouched(Boolean(item));
      setProjectId(item?.project_id ?? defaults?.project_id ?? null);
      setTags((item?.tags ?? defaults?.tags ?? []).join(", "));
      setDescription(item?.description ?? "");
      setMore(Boolean(item && (item.tags.length || item.description)));
    }
  }

  const onUrl = (v: string) => {
    setUrl(v);
    if (!typeTouched) setType(detectLibraryType(v));
    if (!name || name === guessNameFromUrl(url)) setName(guessNameFromUrl(v));
  };

  const valid = /^https?:\/\//i.test(url.trim()) && name.trim();
  const tone = LIBRARY_TYPE_TONE[type] ?? "surface";
  const project = data.projects.find((p) => p.id === projectId);
  const tagList = tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const moreSummary = [project && `${project.icon ?? "📁"} ${project.name}`, tagList.length && tagList.map((t) => `#${t}`).join(" "), description.trim() && "note"]
    .filter(Boolean)
    .join(" · ");

  const submit = async () => {
    if (!valid) return;
    const fields = {
      url: url.trim(),
      name: name.trim(),
      type,
      project_id: projectId,
      tags: tagList,
      description: description.trim() || null,
    };
    if (item) await update("library_items", item.id, fields);
    else await create("library_items", { ...fields, created_by: me?.id ?? null });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Edit link" : "Add to Library"}
      footer={
        <>
          {item && (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                if (confirm(`Remove “${item.name}” from Library? The file itself is not touched.`)) {
                  void remove("library_items", item.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <PillButton disabled={!valid} onClick={() => void submit()}>
            {item ? "Save" : "Add"}
          </PillButton>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="library-url" className="mb-2 block text-[13px] text-fg-2">
            Paste a link
          </label>
          <div className="flex gap-2">
            <div className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-input px-4 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--text)]">
              <Link2 className="size-5 shrink-0 text-fg-3" />
              <input
                id="library-url"
                autoFocus
                inputMode="url"
                placeholder="Google Doc, Sheet, Drive folder, PDF…"
                value={url}
                onChange={(e) => onUrl(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[16px] text-fg placeholder:text-fg-3"
                style={{ outline: "none" }}
              />
            </div>
            {!item && (
              <GooglePickerButton
                onPick={(picked) => {
                  setUrl(picked.url);
                  setName(picked.name);
                  setType(picked.type);
                  setTypeTouched(true);
                }}
              />
            )}
          </div>
          {(url.trim() || item) && (
            <div className="anim-fade mt-2.5 flex items-center gap-2">
              <button
                ref={typeAnchor}
                type="button"
                onClick={typePop.toggle}
                aria-label="Change type"
                className={cn("flex h-8 items-center gap-1.5 rounded-full pl-2.5 pr-2 text-[13px] font-medium", tone === "surface" ? "bg-hover text-fg" : TONE[tone])}
              >
                <LibraryIcon type={type} plain={isColor(tone)} className="size-3.5" />
                {LIBRARY_TYPE_NAME[type].one}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
              {!typeTouched && <span className="text-[12.5px] text-fg-3">Detected from the link</span>}
              <Popover open={typePop.open} onClose={typePop.close} anchor={typePop.anchor} width={220}>
                <MenuList>
                  {LIBRARY_TYPES.map((t) => (
                    <MenuItem
                      key={t.value}
                      icon={<LibraryIcon type={t.value} />}
                      selected={t.value === type}
                      onSelect={() => {
                        setType(t.value);
                        setTypeTouched(true);
                        typePop.close();
                      }}
                    >
                      {LIBRARY_TYPE_NAME[t.value].one}
                    </MenuItem>
                  ))}
                </MenuList>
              </Popover>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="library-name" className="mb-2 block text-[13px] text-fg-2">
            Name
          </label>
          <TextInput id="library-name" placeholder="What should people call it?" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="rounded-[22px] bg-hover">
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">More details</span>
              {!more && <span className="block truncate text-[12.5px] text-fg-2">{moreSummary || "Project, tags and a note — all optional"}</span>}
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-fg-2 transition-transform duration-200", more && "rotate-180")} />
          </button>
          {more && (
            <div className="anim-fade flex flex-col gap-3 px-4 pb-4">
              <div>
                <div className="mb-1 text-[12.5px] text-fg-2">Project</div>
                <div className="-ml-1.5">
                  <ProjectField variant="property" projects={data.projects} value={projectId} onChange={setProjectId} placeholder="None (studio-wide)" />
                </div>
              </div>
              <div>
                <label htmlFor="library-tags" className="mb-1 block text-[12.5px] text-fg-2">
                  Tags
                </label>
                <TextInput id="library-tags" placeholder="brand, template" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div>
                <label htmlFor="library-note" className="mb-1 block text-[12.5px] text-fg-2">
                  Note
                </label>
                <TextInput id="library-note" placeholder="What is it for?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
