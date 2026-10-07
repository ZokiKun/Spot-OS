"use client";

import { useState } from "react";
import type { LibraryItem, LibraryItemType } from "@/lib/types";
import { LIBRARY_TYPES } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { OptionField, ProjectField, PropertyRow } from "@/components/ui/fields";
import { detectLibraryType, guessNameFromUrl } from "./library-meta";
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
  const { data, create, update, me } = useWorkspace();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<LibraryItemType>("url");
  const [typeTouched, setTypeTouched] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
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
    setTags((item?.tags ?? defaults?.tags ?? []).join(", "));
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
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
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
      title={item ? "Edit resource" : "Add to Library"}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => void submit()}>
            {item ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3.5"
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
        <TextInput placeholder="What is it for? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <PropertyRow label="Type">
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
          </PropertyRow>
          <PropertyRow label="Project">
            <ProjectField variant="property" projects={data.projects} value={projectId} onChange={setProjectId} placeholder="Studio-wide" />
          </PropertyRow>
          <div className="col-span-2">
            <PropertyRow label="Tags">
              <input
                placeholder="brand, template"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="h-9 w-full rounded-xl bg-transparent px-1.5 text-[15px] font-bold outline-none placeholder:text-fg-3"
              />
            </PropertyRow>
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
