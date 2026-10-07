"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/directions/d3/lib/types";
import { isSupabaseConfigured } from "@/directions/d3/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/directions/d3/lib/supabase/client";
import { getDemoAdapter } from "@/directions/d3/lib/data";
import { Wordmark } from "@/directions/d3/components/shell/icons";
import { Mascot, SpeechBubble } from "@/directions/d3/components/ui/mascot";
import { Button } from "@/directions/d3/components/ui/button";
import { TextInput } from "@/directions/d3/components/ui/input";
import { Avatar } from "@/directions/d3/components/ui/avatar";
import { useTheme } from "@/directions/d3/components/shell/theme";

export function LoginView() {
  useTheme();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[400px] py-10">
        <div className="mb-6 text-center">
          <Wordmark className="text-[40px] leading-none" />
        </div>
        <div className="mb-6 flex items-center gap-3">
          <Mascot mood="happy" size={88} float />
          <SpeechBubble className="ml-2 flex-1">{isSupabaseConfigured ? "Welcome back! Sign in to see what’s on today." : "Hi! Who’s working today?"}</SpeechBubble>
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
    <form onSubmit={signIn} className="space-y-4">
      <label className="block">
        <span className="label-caps mb-1.5 block px-1 text-[11px] text-fg-3">Email</span>
        <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studiospot.co" />
      </label>
      <label className="block">
        <span className="label-caps mb-1.5 block px-1 text-[11px] text-fg-3">Password</span>
        <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {message && <p className={message.tone === "error" ? "text-[14px] font-bold text-danger" : "text-[14px] font-bold text-fg-2"}>{message.text}</p>}
      <Button type="submit" variant="blue" size="lg" className="w-full" disabled={busy || !password}>
        Continue
      </Button>
      <Button variant="secondary" size="lg" className="w-full" onClick={magicLink} disabled={busy}>
        Email me a sign-in link
      </Button>
      <p className="pt-2 text-center text-[13px] font-semibold text-fg-3">Accounts are created by a workspace admin. There is no public sign-up.</p>
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
      <div className="space-y-3">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              demo?.signInAs(m.id);
              router.replace("/");
            }}
            className="card-press flex w-full items-center gap-4 rounded-2xl bg-bg px-4 py-3.5 text-left hover:border-line-selected hover:bg-selected"
          >
            <Avatar profile={m} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-extrabold">{m.full_name}</div>
              <div className="truncate text-[13.5px] font-semibold text-fg-2">{m.role_title}</div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-[13px] font-semibold text-fg-3">
        Demo mode — Supabase isn’t connected yet, so everything stays in this browser.
      </p>
    </div>
  );
}
