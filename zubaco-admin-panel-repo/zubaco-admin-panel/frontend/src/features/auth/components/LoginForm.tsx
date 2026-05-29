"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(ROUTES.GAMES);
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(ROUTES.GAMES);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141210] px-4 py-12 text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-card/90 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[radial-gradient(circle_at_top,#a5621f33,transparent_50%),linear-gradient(160deg,#181614,#0d0d0d)] p-10 lg:block">
          <p className="mb-6 text-sm uppercase tracking-[0.5em] text-primary/80">ZUBACO</p>
          <h1 className="font-display text-5xl font-semibold leading-tight">
            Design-led control for every game, stage, and rule.
          </h1>
          <p className="mt-6 max-w-md text-white/65">
            Manage tournaments, stages, games, and content from one secure console. Monitor
            releases, adjust rules, and keep your live experience aligned with what players see
            in the app.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <p className="text-sm uppercase tracking-[0.4em] text-primary/80">Admin Access</p>
          <h2 className="mt-4 font-display text-3xl font-semibold">Welcome back</h2>
          <p className="mt-3 text-sm text-white/55">Use your credentials to continue.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-white/65">Username</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-primary"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="text"
                autoComplete="username"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-white/65">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-4 pr-12 outline-none transition placeholder:text-white/30 focus:border-primary"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white/80"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </label>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <Button className="w-full py-3" disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
