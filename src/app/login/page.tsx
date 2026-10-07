"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDemoAdapter } from "@/lib/data";
import { SpotMark } from "@/components/shell/icons";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "@/components/shell/theme";

export default function LoginPage() {
  useTheme();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[340px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <SpotMark size={40} />
          <h1 className="mt-4 text-[22px] font-semibold">Spot OS</h1>
          <p className="mt-1 text-[14px] text-fg-2">Studio Spot’s operating system</p>
        </div>
        {isSupabaseConfigured ? <SupabaseLogin /> : <DemoLogin />}
      </div>
    </div>
  );
}

function SupabaseLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const sb = getSupabaseBrowserClient();

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage({ tone: "error", text: error.message });
    else router.replace("/");
  };

  const magicLink = async () => {
    if (!email) return setMessage({ tone: "error", text: "Enter your email first." });
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    setMessage(error ? { tone: "error", text: error.message } : { tone: "info", text: "Check your inbox for a sign-in link." });
  };

  return (
    <form onSubmit={signIn} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-fg-2">Email</span>
        <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studiospot.co" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-fg-2">Password</span>
        <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {message && <p className={message.tone === "error" ? "text-[13px] text-danger" : "text-[13px] text-fg-2"}>{message.text}</p>}
      <Button type="submit" variant="primary" size="md" className="w-full" disabled={busy || !password}>
        Continue
      </Button>
      <Button variant="ghost" size="md" className="w-full" onClick={magicLink} disabled={busy}>
        Email me a sign-in link
      </Button>
      <p className="pt-2 text-center text-[12px] text-fg-3">Accounts are created by a workspace admin. There is no public sign-up.</p>
    </form>
  );
}

function DemoLogin() {
  const router = useRouter();
  const [members, setMembers] = useState<Profile[]>([]);
  const demo = getDemoAdapter();
  useEffect(() => {
    void demo?.listMembers().then(setMembers);
  }, [demo]);

  return (
    <div>
      <div className="mb-3 rounded-md bg-callout px-3.5 py-3 text-[13px] text-fg-2">
        <span className="font-medium text-fg">Demo mode.</span> Supabase isn’t configured yet, so data lives in this browser. Pick a team member to continue.
      </div>
      <div className="overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_var(--border-strong)]">
        {members.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              demo?.signInAs(m.id);
              router.replace("/");
            }}
            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-hover ${i > 0 ? "border-t border-line" : ""}`}
          >
            <Avatar profile={m} size={28} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium">{m.full_name}</div>
              <div className="truncate text-[12px] text-fg-2">{m.role_title}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
