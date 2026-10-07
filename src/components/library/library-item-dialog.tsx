"use client";

import { useState } from "react";
import type { LibraryItem, LibraryItemType } from "@/lib/types";
import { LIBRARY_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { OptionField, ProjectField } from "@/components/ui/fields";
import { detectLibraryType, guessNameFromUrl } from "./library-meta";
import { GooglePickerButton } from "./google-picker";
import { TagsField } from "@/components/ui/tags-field";

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
  const { data, create, update, me } = useWorkspace();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<LibraryItemType>("url");
  const [typeTouched, setTypeTouched] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");

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
    setTags(item?.tags ?? defaults?.tags ?? []);
      setDescription(item?.description ?? "");
    }
  }

  const onUrl = (v: string) => {
    setUrl(v);
    if (!typeTouched) setType(detectLibraryType(v));
    if (!name || name === guessNameFromUrl(url)) setName(guessNameFromUrl(v));
  };

  const valid = /^https?:\/\//i.test(url.trim()) && name.trim();

  const submit = async () => {
    if (!valid) return;
    const fields = {
      url: url.trim(),
      name: name.trim(),
      type,
      project_id: projectId,
      tags,
      description: description.trim() || null,
    };
    if (item) await update("library_items", item.id, fields);
    else await create("library_items", { ...fields, pinned: false, pinned_by: [], created_by: me?.id ?? null });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Edit resource" : "Add to Library"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => void submit()}>
            {item ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex gap-2">
          <TextInput autoFocus placeholder="Paste a URL — Google Doc, Sheet, Drive folder, PDF…" value={url} onChange={(e) => onUrl(e.target.value)} />
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
        <TextInput placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-1 text-[14px]">
          <span className="text-fg-2">Type</span>
          <div className="-ml-1.5">
            <OptionField
              variant="property"
              kind="select"
              options={LIBRARY_TYPES}
              value={type}
              onChange={(t) => {
                setType(t);
                setTypeTouched(true);
              }}
            />
          </div>
          <span className="text-fg-2">Project</span>
          <div className="-ml-1.5">
            <ProjectField variant="property" projects={data.projects} value={projectId} onChange={setProjectId} placeholder="None (studio-wide)" />
          </div>
          <span className="text-fg-2">Tags</span>
          <div className="-ml-1.5">
            <TagsField variant="property" scope="library" value={tags} onChange={setTags} placeholder="Add tags" />
          </div>
          <span className="text-fg-2">Note</span>
          <TextInput placeholder="What is it for? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
