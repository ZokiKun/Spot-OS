"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

export const PROJECT_ICONS = ["📁", "🧭", "🪶", "🫙", "🟠", "⚙️", "📓", "🔤", "🎨", "📐", "🖼️", "🎬", "📦", "🌱", "✳️", "🔶", "🧪", "💡", "🎮", "📣", "🌍", "✏️", "🐷", "🚀"];

/** A project icon is an emoji, or the URL of an uploaded image ("custom emoji"). */
export const isImageIcon = (icon: string | null | undefined) => !!icon && /^(https?:|\/|data:|blob:)/.test(icon);

/**
 * Renders a project icon. Emoji render as text; custom images are sized to the surrounding
 * font (1.15em), so they drop into any place an emoji did.
 */
export function ProjectIcon({ icon, fallback = "📁", className }: { icon: string | null | undefined; fallback?: string; className?: string }) {
  const value = icon || fallback;
  if (isImageIcon(value))
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" draggable={false} className={cn("inline-block size-[1.15em] shrink-0 rounded-[3px] object-cover align-[-0.2em]", className)} />;
  return <>{value}</>;
}

/** Custom emoji live in the shared "custom_emoji" workspace setting, so everyone can reuse them. */
const SETTINGS_KEY = "custom_emoji";
interface CustomEmoji {
  url: string;
  name: string;
}

function useCustomEmoji() {
  const { data, create, update } = useWorkspace();
  const row = data.settings.find((s) => s.key === SETTINGS_KEY);
  const list = ((row?.value.items as CustomEmoji[] | undefined) ?? []).filter((e) => e?.url);
  const save = (items: CustomEmoji[]) => {
    const value = { ...(row?.value ?? {}), items };
    if (row) void update("settings", row.id, { value });
    else void create("settings", { key: SETTINGS_KEY, value });
  };
  return { list, save };
}

/** First "character" as people see it (so a flag or skin-toned emoji isn't cut in half). */
function firstGrapheme(text: string) {
  const t = text.trim();
  if (!t) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return seg.segment(t)[Symbol.iterator]().next().value?.segment ?? "";
  }
  return Array.from(t)[0] ?? "";
}

/**
 * Icon picker: preset emoji, any emoji typed or pasted (incl. the system emoji keyboard),
 * and custom emoji — images uploaded once and shared with the whole workspace.
 */
export function IconPicker({ value, onPick }: { value: string | null | undefined; onPick: (icon: string) => void }) {
  const { upload, canEdit } = useWorkspace();
  const toast = useToast();
  const custom = useCustomEmoji();
  const fileRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.show({ title: "Pick an image file", description: "PNG, JPG, GIF, WebP or SVG.", tone: "error" });
    if (file.size > 2 * 1024 * 1024) return toast.show({ title: "That image is over 2 MB", description: "Custom emoji show tiny — a small square image works best.", tone: "error" });
    setBusy(true);
    try {
      const { url } = await upload(file, "custom-emoji");
      custom.save([...custom.list, { url, name: file.name.replace(/\.[^.]+$/, "") }]);
      onPick(url);
    } catch {
      /* upload shows its own toast */
    } finally {
      setBusy(false);
    }
  };

  const cell = (icon: string, label?: string) => (
    <button
      type="button"
      title={label}
      onClick={() => onPick(icon)}
      className={cn("flex size-8 items-center justify-center rounded-md text-[18px] hover:bg-hover", value === icon && "bg-active")}
    >
      <ProjectIcon icon={icon} />
    </button>
  );

  return (
    <div className="p-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const g = firstGrapheme(typed);
          if (g) onPick(g);
          setTyped("");
        }}
        className="mb-2 flex gap-1"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type or paste any emoji… ⌃⌘Space"
          aria-label="Any emoji"
          className="h-8 min-w-0 flex-1 rounded-md bg-hover px-2 text-[14px] outline-none placeholder:text-fg-3 focus:shadow-[inset_0_0_0_1px_var(--accent)]"
        />
        <button type="submit" disabled={!typed.trim()} className="h-8 shrink-0 rounded-md px-2 text-[13px] text-fg-2 hover:bg-hover disabled:opacity-40">
          Use
        </button>
      </form>
      <div className="grid grid-cols-8 gap-0.5">
        {PROJECT_ICONS.map((i) => (
          <div key={i}>{cell(i)}</div>
        ))}
      </div>
      <div className="mb-1 mt-2.5 flex items-center px-0.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">Custom</div>
      <div className="grid grid-cols-8 gap-0.5">
        {custom.list.map((e) => (
          <div key={e.url} className="group/emoji relative">
            {cell(e.url, e.name)}
            {canEdit && (
              <button
                type="button"
                aria-label={`Remove ${e.name}`}
                title="Remove from the custom emoji (projects using it keep it)"
                onClick={() => custom.save(custom.list.filter((x) => x.url !== e.url))}
                className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-elevated text-fg-2 shadow-menu hover:text-fg group-hover/emoji:flex"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <button
            type="button"
            title="Upload an image as a custom emoji"
            aria-label="Upload custom emoji"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-md text-fg-3 shadow-[inset_0_0_0_1px_var(--border)] hover:bg-hover hover:text-fg-2 disabled:animate-pulse"
          >
            <ImagePlus className="size-4" />
          </button>
        )}
      </div>
      {custom.list.length === 0 && <p className="mt-1.5 px-0.5 text-[12px] text-fg-3">Upload a small square image to use it as an emoji — the whole team can reuse it.</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
