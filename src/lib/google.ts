"use client";

/** Shared Google Identity Services helpers (Drive Picker, Google Calendar sync). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

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

export function loadScript(src: string) {
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


/** OAuth access token for `scope`, via the Google Identity Services popup. */
export async function requestGoogleToken(scope: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google isn’t configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID).");
  await loadScript("https://accounts.google.com/gsi/client");
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? "Google sign-in cancelled"))),
    });
    client.requestAccessToken({ prompt: "" });
  });
}
