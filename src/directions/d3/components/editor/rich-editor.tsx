"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { cn } from "@/directions/d3/lib/utils";
import { useLatest } from "@/directions/d3/lib/hooks";

export interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Upload an image and return its URL; enables paste/drop/toolbar image insert. */
  onUploadImage?: (file: File) => Promise<string>;
  className?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

/**
 * Notion-like rich text: markdown shortcuts (#, -, 1., [ ]), a bubble menu for inline marks,
 * and a slim block toolbar. Stores HTML. Remote updates apply only while not focused (last write wins).
 */
export function RichEditor({ value, onChange, placeholder = "Write something…", onUploadImage, className, editable = true, autoFocus }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useLatest(onUploadImage);
  const onChangeRef = useLatest(onChange);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { class: cn("prose-notion min-h-[160px] outline-none", className) },
      handlePaste: (view, event) => insertImagesFrom(event.clipboardData?.files, view.state.selection.from),
      handleDrop: (view, event) => {
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
        return insertImagesFrom((event as DragEvent).dataTransfer?.files, pos);
      },
    },
    // Only persist real user edits — Tiptap may normalise stored HTML on load, which must not count as an edit.
    onUpdate: ({ editor }) => {
      if (!editor.isFocused) return;
      onChangeRef.current(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  function insertImagesFrom(files: FileList | null | undefined, pos: number) {
    const images = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!images.length || !uploadRef.current) return false;
    void (async () => {
      for (const file of images) {
        try {
          const src = await uploadRef.current!(file);
          editor?.chain().focus().insertContentAt(pos, { type: "image", attrs: { src, alt: file.name } }).run();
        } catch {
          /* toast already shown by uploader */
        }
      }
    })();
    return true;
  }

  // Apply remote changes when the user isn't actively editing.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return <div className="min-h-[160px]" />;

  return (
    <div className="group/editor relative">
      {editable && <BlockToolbar editor={editor} onImage={onUploadImage ? () => fileRef.current?.click() : undefined} />}
      {editable && (
        <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-xl bg-elevated p-1 shadow-menu">
          <MarkButtons editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          insertImagesFrom(e.target.files, editor.state.selection.from);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ToolButton({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-hover hover:text-fg",
        active && "bg-blue-soft text-blue",
      )}
    >
      {children}
    </button>
  );
}

function useActive(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
    }),
  });
}

function setLink(editor: Editor) {
  const prev = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", prev ?? "https://");
  if (url === null) return;
  if (url === "" || url === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
  else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function MarkButtons({ editor }: { editor: Editor }) {
  const a = useActive(editor);
  return (
    <>
      <ToolButton label="Bold" active={a.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton label="Italic" active={a.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton label="Strikethrough" active={a.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </ToolButton>
      <ToolButton label="Inline code" active={a.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </ToolButton>
      <ToolButton label="Link" active={a.link} onClick={() => setLink(editor)}>
        <Link2 className="size-4" />
      </ToolButton>
    </>
  );
}

function BlockToolbar({ editor, onImage }: { editor: Editor; onImage?: () => void }) {
  const a = useActive(editor);
  return (
    <div className="no-print z-10 -mx-1 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border-2 border-line bg-subtle p-1 opacity-70 transition-opacity focus-within:opacity-100 group-hover/editor:opacity-100">
      <ToolButton label="Heading 1" active={a.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-4" />
      </ToolButton>
      <ToolButton label="Heading 2" active={a.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolButton>
      <ToolButton label="Heading 3" active={a.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </ToolButton>
      <span className="mx-1 h-5 w-[2px] rounded bg-line" />
      <MarkButtons editor={editor} />
      <span className="mx-1 h-5 w-[2px] rounded bg-line" />
      <ToolButton label="Bulleted list" active={a.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolButton>
      <ToolButton label="Numbered list" active={a.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton label="Checklist" active={a.task} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks className="size-4" />
      </ToolButton>
      <ToolButton label="Quote" active={a.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolButton>
      {onImage && (
        <ToolButton label="Insert image" onClick={onImage}>
          <ImagePlus className="size-4" />
        </ToolButton>
      )}
    </div>
  );
}
