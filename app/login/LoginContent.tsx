"use client";

import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const LoginContent = () => {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const configError = useMemo(() => errorParam === "config", [errorParam]);
  const authError = useMemo(() => errorParam === "auth", [errorParam]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage(null);
      const trimmed = email.trim();
      if (!trimmed) {
        setStatus("error");
        setMessage("Enter your email address.");
        return;
      }
      setStatus("sending");
      try {
        const supabase = createSupabaseBrowserClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: { emailRedirectTo: `${origin}/auth/callback` }
        });
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setStatus("sent");
        setMessage("Check your email for the sign-in link.");
      } catch {
        setStatus("error");
        setMessage("Could not start sign-in. Check Supabase environment variables.");
      }
    },
    [email]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Sign in</h1>
      <p className="mt-2 text-sm text-slate-400">
        We email you a magic link. After you sign in, design history loads automatically on the home page.
      </p>
      {configError ? (
        <p className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Supabase Auth is not configured (missing public URL or anon key).
        </p>
      ) : null}
      {authError ? (
        <p className="mt-4 rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
          Sign-in failed or the link expired. Request a new link below.
        </p>
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-slate-300">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500/40 focus:ring-2"
            placeholder="you@company.com"
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {status === "sending" ? "Sending link…" : "Email magic link"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-rose-200" : "text-emerald-200"}`}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/" className="font-medium text-blue-400 hover:text-blue-300">
          ← Back to banner generator
        </Link>
      </p>
    </main>
  );
};
