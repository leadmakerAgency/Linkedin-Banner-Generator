import { Suspense } from "react";
import { LoginContent } from "./LoginContent";

const LoginFallback = () => (
  <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
    <p className="text-sm text-slate-400">Loading sign-in…</p>
  </main>
);

const LoginPage = () => (
  <Suspense fallback={<LoginFallback />}>
    <LoginContent />
  </Suspense>
);

export default LoginPage;
