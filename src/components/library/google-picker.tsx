"use client";

import { useState } from "react";
import type { LibraryItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { GOOGLE_CLIENT_ID, loadScript, requestGoogleToken } from "@/lib/google";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "";
export const isGooglePickerConfigured = Boolean(GOOGLE_CLIENT_ID && API_KEY);

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
      await loadScript("https://apis.google.com/js/api.js");
      await new Promise<void>((r) => window.gapi!.load("picker", r));
      if (!token) token = await requestGoogleToken("https://www.googleapis.com/auth/drive.file");
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
    <Button onClick={() => void open()} disabled={busy} className="h-8">
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path fill="#4285f4" d="M7.7 3.5h8.6l5.2 9h-8.6z" />
        <path fill="#0f9d58" d="M2.5 15.5l4.3-7.5 4.3 7.5-4.3 7.5z" transform="translate(0 -2)" />
        <path fill="#f4b400" d="M6.8 20.5l4.3-7.5h10.4l-4.3 7.5z" />
      </svg>
      Drive
    </Button>
  );
}
