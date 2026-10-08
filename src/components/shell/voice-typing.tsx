"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// The Web Speech API isn't in TypeScript's DOM types yet.
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noSubscribe = () => () => {};

const TEXT_INPUTS = new Set(["", "text", "search", "url", "email", "tel"]);
/** Somewhere you can type text (not passwords, dates, numbers or checkboxes). */
function isTypable(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return TEXT_INPUTS.has(el.type) && !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

/** Whether dictated text needs a space in front (not at the start, not after a space). */
function needsSpace(el: HTMLElement) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const at = el.selectionStart ?? el.value.length;
    return at > 0 && !/\s/.test(el.value[at - 1] ?? "");
  }
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;
  const prev = (node.textContent ?? "")[(sel?.anchorOffset ?? 0) - 1];
  return !!prev && !/\s/.test(prev);
}

/**
 * Voice typing anywhere you can type: focus a field and a mic appears at its edge (or press Alt+V).
 * Speech is turned into text by the browser and typed at the cursor, so it works in plain inputs
 * and in the rich-text editor alike.
 */
export function VoiceTyping() {
  const supported = useSyncExternalStore(noSubscribe, () => !!getCtor(), () => false);
  const toast = useToast();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const stop = useCallback(() => {
    rec.current?.stop();
    rec.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    const el = targetRef.current;
    if (!Ctor || !el) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-IN";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0].transcript;
        if (!res.isFinal) {
          live += text;
          continue;
        }
        const field = targetRef.current;
        if (!field) continue;
        field.focus();
        const clean = text.trim();
        if (clean) document.execCommand("insertText", false, (needsSpace(field) ? " " : "") + clean);
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        toast.show({ title: "Microphone blocked", description: "Allow the microphone for this site (icon left of the address bar), then try again.", tone: "error" });
      else if (e.error !== "no-speech" && e.error !== "aborted") toast.show({ title: "Voice typing stopped", description: e.error, tone: "error" });
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  }, [toast]);

  // Follow the focused field.
  useEffect(() => {
    if (!supported) return;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element;
      if (!isTypable(el)) return;
      if (el !== targetRef.current && rec.current) stop();
      targetRef.current = el;
      setTarget(el);
      setRect(el.getBoundingClientRect());
    };
    const onFocusOut = () => {
      // Let focus land first; keep the mic while dictating.
      setTimeout(() => {
        if (rec.current) return;
        if (!isTypable(document.activeElement)) {
          targetRef.current = null;
          setTarget(null);
        }
      }, 120);
    };
    const onMove = () => targetRef.current && setRect(targetRef.current.getBoundingClientRect());
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === "KeyV" && isTypable(document.activeElement)) {
        e.preventDefault();
        if (rec.current) stop();
        else start();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [supported, start, stop]);

  useEffect(() => () => rec.current?.stop(), []);

  if (!supported || !target || !rect || !target.isConnected || rect.width < 60) return null;
  // Inside the field's right edge: centred on one-line inputs, bottom corner on taller fields.
  const tall = rect.height > 44;
  const top = tall ? rect.bottom - 30 : rect.top + (rect.height - 24) / 2;
  const left = rect.right - 30;

  return createPortal(
    <div className="no-print pointer-events-none fixed z-[60]" style={{ top, left }}>
      {listening && (
        <div className="anim-fade absolute bottom-8 right-0 w-max max-w-72 rounded-md bg-elevated px-2.5 py-1.5 text-[12px] text-fg-2 shadow-menu">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-[var(--dot-red)] align-middle" />
          {interim || "Listening… speak now"}
        </div>
      )}
      <button
        type="button"
        // Keep focus (and the cursor) in the field.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (rec.current ? stop() : start())}
        aria-label={listening ? "Stop voice typing" : "Voice typing (Alt+V)"}
        title={listening ? "Stop voice typing" : "Voice typing (Alt+V)"}
        className={cn(
          "pointer-events-auto flex size-6 items-center justify-center rounded-full transition-colors",
          listening ? "bg-[var(--dot-red)] text-white" : "bg-bg/80 text-fg-3 opacity-70 hover:bg-hover hover:text-fg hover:opacity-100",
        )}
      >
        {listening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
      </button>
    </div>,
    document.body,
  );
}
