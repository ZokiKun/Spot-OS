"use client";

import { useState } from "react";
import type { LibraryItemType } from "@/lib/types";
import { PillButton } from "@/components/ui/chunk";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "";
export const isGooglePickerConfigured = Boolean(CLIENT_ID && API_KEY);

/* Minimal typings for the Google Picker + Identity Services globals. */
type PickerDoc = { url: string; name: string; mimeType: string };
type PickerResult = { action: string; docs?: PickerDoc[] };
declare global {
  interface Window {
    gapi?: { load: (lib: string, cb: () => void) => void };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (r: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (o?: { prompt?: string }) => void };
        };
      };
      picker: {
        PickerBuilder: new () => {
          addView: (v: unknown) => unknown;
          setOAuthToken: (t: string) => unknown;
          setDeveloperKey: (k: string) => unknown;
          setAppId: (id: string) => unknown;
          setCallback: (cb: (r: PickerResult) => void) => unknown;
          build: () => { setVisible: (v: boolean) => void };
        };
        DocsView: new (viewId?: string) => { setIncludeFolders: (b: boolean) => unknown; setSelectFolderEnabled: (b: boolean) => unknown };
        ViewId: { DOCS: string };
        Action: { PICKED: string };
      };
    };
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function typeFromMime(mime: string): LibraryItemType {
  if (mime === "application/vnd.google-apps.document") return "google_doc";
  if (mime === "application/vnd.google-apps.spreadsheet") return "google_sheet";
  if (mime === "application/vnd.google-apps.presentation") return "google_slides";
  if (mime === "application/vnd.google-apps.folder") return "drive_folder";
  if (mime === "application/pdf") return "pdf";
  return "drive_file";
}

let token: string | null = null;

/** Opens Google Picker to choose a Drive file/folder. Hidden unless Google env vars are set. */
export function GooglePickerButton({ onPick }: { onPick: (p: { url: string; name: string; type: LibraryItemType }) => void }) {
  const [busy, setBusy] = useState(false);
  if (!isGooglePickerConfigured) return null;

  const open = async () => {
    setBusy(true);
    try {
      await Promise.all([loadScript("https://apis.google.com/js/api.js"), loadScript("https://accounts.google.com/gsi/client")]);
      await new Promise<void>((r) => window.gapi!.load("picker", r));
      if (!token) {
        token = await new Promise<string>((resolve, reject) => {
          const client = window.google!.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? "Google sign-in cancelled"))),
          });
          client.requestAccessToken({ prompt: "" });
        });
      }
      const g = window.google!.picker;
      const view = new g.DocsView(g.ViewId.DOCS);
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(true);
      const builder = new g.PickerBuilder();
      builder.addView(view);
      builder.setOAuthToken(token);
      builder.setDeveloperKey(API_KEY);
      if (APP_ID) builder.setAppId(APP_ID);
      builder.setCallback((r) => {
        if (r.action === g.Action.PICKED && r.docs?.[0]) {
          const d = r.docs[0];
          onPick({ url: d.url, name: d.name, type: typeFromMime(d.mimeType) });
        }
      });
      builder.build().setVisible(true);
    } catch (err) {
      token = null;
      alert(err instanceof Error ? err.message : "Google Picker failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PillButton tone="outline" size="lg" onClick={() => void open()} disabled={busy}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285f4" d="M7.7 3.5h8.6l5.2 9h-8.6z" />
        <path fill="#0f9d58" d="M2.5 15.5l4.3-7.5 4.3 7.5-4.3 7.5z" transform="translate(0 -2)" />
        <path fill="#f4b400" d="M6.8 20.5l4.3-7.5h10.4l-4.3 7.5z" />
      </svg>
      Drive
    </PillButton>
  );
}
