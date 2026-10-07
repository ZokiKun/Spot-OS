"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import type { Profile } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDemoAdapter } from "@/lib/data";
import { SpotMark } from "@/components/shell/icons";
import { MEMBER_TONE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, MUTED, PillButton } from "@/components/ui/chunk";
import { TextInput } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "@/components/shell/theme";

const INPUT = "h-12 rounded-full px-5 text-[15px]";

export default function LoginPage() {
  useTheme();
  return (
    <div className="flex min-h-dvh justify-center bg-bg px-4 py-12 sm:items-center">
      <div className="anim-rise w-full max-w-[420px]">
        <SpotMark size={72} />
        <h1 className="mt-8 text-[44px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[54px]">
          Welcome to
          <br />
          Spot OS
        </h1>
        <p className="mb-8 mt-3 text-[15px] leading-relaxed text-fg-2">Studio Spot’s projects, tasks and notes, all in one calm place.</p>
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
    <form onSubmit={signIn} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1.5 block px-1 text-[13.5px] text-fg-2">Email</span>
        <TextInput
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studiospot.co"
          className={INPUT}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block px-1 text-[13.5px] text-fg-2">Password</span>
        <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
      </label>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={cn("rounded-[22px] px-4 py-3 text-[14px]", message.tone === "error" ? "bg-coral text-on-chunk" : "bg-lime text-on-chunk")}
        >
          {message.text}
        </p>
      )}
      <PillButton type="submit" size="lg" className="mt-2 w-full" disabled={busy || !password}>
        Continue <ArrowRight />
      </PillButton>
      <PillButton tone="outline" size="lg" className="w-full" onClick={magicLink} disabled={busy}>
        <Mail /> Email me a sign-in link
      </PillButton>
      <p className="pt-2 text-center text-[13px] text-fg-3">Accounts are made by a workspace admin. There’s no public sign-up.</p>
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
      <div className="mb-4 rounded-[22px] bg-elevated px-5 py-4 text-[14px] leading-snug text-fg-2">
        <span className="font-medium text-fg">Demo mode.</span> Supabase isn’t set up yet, so everything lives in this browser. Who are you?
      </div>
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
        {members.map((m) => {
          const tone = MEMBER_TONE[m.color] ?? "cream";
          return (
            <Card
              key={m.id}
              tone={tone}
              onClick={() => {
                demo?.signInAs(m.id);
                router.replace("/");
              }}
              className="min-h-[92px] flex-row items-center gap-4 sm:min-h-[150px] sm:flex-col sm:items-start"
            >
              <span className="shrink-0 rounded-full bg-[#fffdf8]/75 p-[3px]">
                <Avatar profile={m} size={48} />
              </span>
              <div className="min-w-0 flex-1 sm:mt-auto">
                <div className="truncate text-[19px] font-medium tracking-[-0.02em]">{m.full_name}</div>
                <div className={cn("truncate text-[13px]", MUTED[tone])}>{m.role_title ?? "Team"}</div>
              </div>
              <ArrowRight className="size-5 shrink-0 opacity-50 sm:hidden" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
