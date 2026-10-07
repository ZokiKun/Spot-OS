"use client";

import { useRef, useState } from "react";
import { ImagePlus, MoveVertical, Trash2, Upload } from "lucide-react";
import type { Project } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, usePopover } from "@/components/ui/popover";

export const COVER_GRADIENTS: Record<string, string> = {
  dusk: "linear-gradient(135deg,#f6d365 0%,#fda085 45%,#c471a5 100%)",
  clay: "linear-gradient(135deg,#e8cbc0 0%,#c79081 55%,#8e5b4a 100%)",
  sea: "linear-gradient(135deg,#a1c4fd 0%,#4f8fd8 60%,#22577a 100%)",
  moss: "linear-gradient(135deg,#d4fc79 0%,#96e6a1 45%,#3d8361 100%)",
  sun: "linear-gradient(135deg,#fff1a8 0%,#ffd166 50%,#f77f00 100%)",
  rose: "linear-gradient(135deg,#ffdde1 0%,#ee9ca7 55%,#b5577a 100%)",
  lilac: "linear-gradient(135deg,#e0c3fc 0%,#a18cd1 55%,#5f4b8b 100%)",
  ink: "linear-gradient(135deg,#434343 0%,#262626 60%,#000000 100%)",
  spot: "radial-gradient(circle at 18% 40%,#ff7a1a 0 14%,transparent 14.5%),linear-gradient(135deg,#fff4ea,#ffd9b8)",
  paper: "repeating-linear-gradient(45deg,#f4f1ea 0 12px,#ece7dc 12px 24px)",
};

export const coverStyle = (cover: string, position = 50): React.CSSProperties =>
  cover.startsWith("gradient:")
    ? { background: COVER_GRADIENTS[cover.slice(9)] ?? COVER_GRADIENTS.dusk }
    : { backgroundImage: `url("${cover.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: `center ${position}%` };

function CoverPicker({ project, onDone }: { project: Project; onDone: () => void }) {
  const { update, upload } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const set = (cover: string | null) => {
    void update("projects", project.id, { cover, cover_position: 50 });
    onDone();
  };
  return (
    <div className="p-2">
      <div className="mb-1.5 px-1 text-[12px] font-medium text-fg-2">Gradients</div>
      <div className="grid grid-cols-5 gap-1.5">
        {Object.keys(COVER_GRADIENTS).map((k) => (
          <button
            key={k}
            type="button"
            title={k}
            aria-label={`${k} banner`}
            onClick={() => set(`gradient:${k}`)}
            className={cn("h-10 rounded-md shadow-[inset_0_0_0_1px_var(--border)] transition-transform hover:scale-[1.04]", project.cover === `gradient:${k}` && "ring-2 ring-accent")}
            style={{ background: COVER_GRADIENTS[k] }}
          />
        ))}
      </div>
      <div className="-mx-2 my-2 h-px bg-line" />
      <div className="flex items-center gap-1">
        <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          <Upload className="size-3.5" /> {busy ? "Uploading…" : "Upload image"}
        </Button>
        {project.cover && (
          <Button variant="ghost" className="ml-auto" onClick={() => set(null)}>
            <Trash2 className="size-3.5" /> Remove
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[11.5px] text-fg-3">Wide images work best (at least 1500px across).</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const { url } = await upload(file, `projects/${project.id}/cover`);
            set(url);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Full-bleed project banner with change / reposition controls. */
export function ProjectCover({ project }: { project: Project }) {
  const { update } = useWorkspace();
  const { setAnchor: anchorRef, ...pop } = usePopover();
  const [drag, setDrag] = useState<{ startY: number; startPos: number; pos: number } | null>(null);
  const [repositioning, setRepositioning] = useState(false);
  if (!project.cover) return null;
  const isImage = !project.cover.startsWith("gradient:");
  const pos = drag?.pos ?? project.cover_position;

  return (
    <div
      className={cn("group/cover relative h-[22vh] min-h-[140px] max-h-[300px] w-full select-none", repositioning && "cursor-ns-resize")}
      style={coverStyle(project.cover, pos)}
      onPointerDown={(e) => {
        // Presses on the Save / Cancel buttons must stay clicks, not drags.
        if (!repositioning || (e.target as HTMLElement).closest("button")) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ startY: e.clientY, startPos: pos, pos });
      }}
      onPointerMove={(e) => {
        if (!drag || Number.isNaN(drag.startY)) return;
        const h = e.currentTarget.getBoundingClientRect().height;
        setDrag({ ...drag, pos: Math.max(0, Math.min(100, drag.startPos - ((e.clientY - drag.startY) / h) * 100)) });
      }}
      onPointerUp={() => drag && setDrag({ ...drag, startPos: drag.pos, startY: Number.NaN })}
    >
      {repositioning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-[13px] font-medium text-white">Drag the image up or down</div>
      )}
      <div className={cn("absolute bottom-3 right-4 flex gap-1 transition-opacity sm:right-10", repositioning || pop.open ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100")}>
        {repositioning ? (
          <>
            <CoverButton
              onClick={() => {
                void update("projects", project.id, { cover_position: Math.round(pos) });
                setRepositioning(false);
                setDrag(null);
              }}
            >
              Save position
            </CoverButton>
            <CoverButton onClick={() => (setRepositioning(false), setDrag(null))}>Cancel</CoverButton>
          </>
        ) : (
          <>
            <CoverButton ref={anchorRef} onClick={pop.toggle}>
              <ImagePlus className="size-3.5" /> Change banner
            </CoverButton>
            {isImage && (
              <CoverButton onClick={() => setRepositioning(true)}>
                <MoveVertical className="size-3.5" /> Reposition
              </CoverButton>
            )}
          </>
        )}
      </div>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} align="end" width={320}>
        <CoverPicker project={project} onDone={pop.close} />
      </Popover>
    </div>
  );
}

const CoverButton = ({ ref, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) => (
  <button
    ref={ref}
    type="button"
    className={cn("inline-flex h-7 items-center gap-1.5 rounded-md bg-white/90 px-2.5 text-[12.5px] font-medium text-[#32302c] shadow-sm backdrop-blur hover:bg-white", className)}
    {...props}
  />
);

/** "Add banner" control shown on hover when a project has no banner yet. */
export function AddCoverButton({ project }: { project: Project }) {
  const { setAnchor: anchorRef, ...pop } = usePopover();
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={pop.toggle}
        className={cn("inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-fg-3 transition-opacity hover:bg-hover hover:text-fg-2", pop.open ? "opacity-100" : "opacity-0 group-hover/head:opacity-100 focus:opacity-100")}
      >
        <ImagePlus className="size-3.5" /> Add banner
      </button>
      <Popover open={pop.open} onClose={pop.close} anchor={pop.anchor} width={320}>
        <CoverPicker project={project} onDone={pop.close} />
      </Popover>
    </>
  );
}
