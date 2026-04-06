"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  fireButtonClass,
  ghostButtonClass,
  inputClass,
  monoLabelClass,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { loginSchema, registerSchema } from "@/lib/validations";
import { isOnboardingComplete, type AuthUser } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type AuthMode = "login" | "register";

type LoginResponse = {
  access_token: string;
  role: "admin" | "student";
};

function AuthCard({
  mode,
  onModeChange,
  children,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(panelClass, "app-noise w-full max-w-xl p-7 sm:p-8")}>
      <StatusBadge tone="fire">Closed-loop access</StatusBadge>
      <h1 className="mt-5 font-display text-5xl leading-none tracking-[0.08em] text-[var(--cream)]">
        ENTER THE PREP CONSOLE
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-[rgba(194,186,176,0.74)]">
        Login to continue your adaptive plan, revision queue, PYQ analysis, and grounded
        study chat.
      </p>

      <div className="mt-8 grid grid-cols-2 rounded-full border border-white/10 bg-white/3 p-1">
        {(["login", "register"] as AuthMode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onModeChange(tab)}
            className={cn(
              "rounded-full px-4 py-3 font-mono text-[0.68rem] uppercase tracking-[0.28em] transition",
              mode === tab
                ? "bg-[var(--fire)] text-white"
                : "text-[rgba(194,186,176,0.7)] hover:text-[var(--cream)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-8">{children}</div>
    </section>
  );
}

function AuthPromo() {
  const promoItems = [
    {
      icon: ShieldCheck,
      text: "Verified PYQs and structured weak-topic tracking",
    },
    {
      icon: Target,
      text: "Roadmap and planner working from the same readiness signal",
    },
    {
      icon: Sparkles,
      text: "Grounded chat that knows your current study context",
    },
  ];

  return (
    <section className={cn(panelClass, "app-noise hidden min-h-[620px] flex-col justify-between p-8 xl:flex")}>
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(232,82,10,0.22)] bg-[rgba(232,82,10,0.08)]">
            <Sparkles className="h-5 w-5 text-[var(--fire)]" />
          </div>
          <div>
            <p className="font-display text-3xl leading-none tracking-[0.12em] text-[var(--cream)]">
              SMART<span className="text-[var(--fire)]">EXAM</span>PREP
            </p>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-[rgba(194,186,176,0.62)]">
              Premium GATE workflow
            </p>
          </div>
        </div>

        <h2 className="mt-10 font-display text-[4.2rem] leading-[0.88] tracking-[0.08em] text-[var(--cream)]">
          STUDY WITH A SYSTEM, NOT A PILE OF FEATURES.
        </h2>
        <p className="mt-6 max-w-lg font-serif text-2xl italic leading-9 text-[rgba(194,186,176,0.84)]">
          Diagnostic, roadmap, planner, revision, PYQ browser, and chat should feel like
          one loop from the first session.
        </p>
      </div>

      <div className="space-y-4">
        {promoItems.map((item, index) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={`promo-${index}`}
              className="rounded-[24px] border border-white/8 bg-white/3 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.08)]">
                  <ItemIcon className="h-4 w-4 text-[var(--ice)]" />
                </div>
                <p className="text-sm leading-7 text-[rgba(194,186,176,0.74)]">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const initialMode = useMemo<AuthMode>(() => {
    return searchParams.get("mode") === "register" ? "register" : "login";
  }, [searchParams]);

  const [mode, setMode] = useState<AuthMode>(initialMode);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleLoginSubmit = loginForm.handleSubmit(async (values) => {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", values);

      let user: AuthUser | null = null;
      try {
        const meResponse = await api.get<AuthUser>("/auth/me", {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        user = meResponse.data;
      } catch {
        user = null;
      }

      setAuth(data.access_token, data.role, user);
      if (data.role === "admin") {
        router.push("/admin");
        return;
      }

      router.push(isOnboardingComplete(user) ? "/dashboard" : "/onboarding");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid credentials";
      toast({
        variant: "destructive",
        title: "Login failed",
        description: message,
      });
    }
  });

  const handleRegisterSubmit = registerForm.handleSubmit(async (values) => {
    try {
      await api.post("/auth/register", values);
      toast({
        title: "Registration successful",
        description: "You can now sign in with your account.",
      });
      setMode("login");
      loginForm.setValue("email", values.email);
      loginForm.setValue("password", "");
      registerForm.reset({
        full_name: "",
        email: values.email,
        password: "",
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Registration failed";
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: message,
      });
    }
  });

  const activeForm = mode === "login" ? loginForm : registerForm;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,82,10,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,212,255,0.12),transparent_24%)]" />
      <div className="app-grid pointer-events-none absolute inset-0 opacity-[0.05]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1400px] gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AuthPromo />

        <div className="flex items-center justify-center">
          <AuthCard mode={mode} onModeChange={setMode}>
            {mode === "login" ? (
              <form className="space-y-6" onSubmit={handleLoginSubmit}>
                <div>
                  <label className={monoLabelClass} htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={cn(inputClass, "mt-3")}
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email ? (
                    <p className="mt-2 text-xs text-rose-300">
                      {loginForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={monoLabelClass} htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className={cn(inputClass, "mt-3")}
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password ? (
                    <p className="mt-2 text-xs text-rose-300">
                      {loginForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={activeForm.formState.isSubmitting}
                  className={cn(fireButtonClass, "w-full justify-center")}
                >
                  {activeForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleRegisterSubmit}>
                <div>
                  <label className={monoLabelClass} htmlFor="full_name">
                    Full Name
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    className={cn(inputClass, "mt-3")}
                    {...registerForm.register("full_name")}
                  />
                  {registerForm.formState.errors.full_name ? (
                    <p className="mt-2 text-xs text-rose-300">
                      {registerForm.formState.errors.full_name.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={monoLabelClass} htmlFor="register_email">
                    Email
                  </label>
                  <input
                    id="register_email"
                    type="email"
                    className={cn(inputClass, "mt-3")}
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email ? (
                    <p className="mt-2 text-xs text-rose-300">
                      {registerForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={monoLabelClass} htmlFor="register_password">
                    Password
                  </label>
                  <input
                    id="register_password"
                    type="password"
                    className={cn(inputClass, "mt-3")}
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password ? (
                    <p className="mt-2 text-xs text-rose-300">
                      {registerForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={activeForm.formState.isSubmitting}
                  className={cn(fireButtonClass, "w-full justify-center")}
                >
                  {activeForm.formState.isSubmitting
                    ? "Creating account..."
                    : "Create Account"}
                </button>
              </form>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 text-[0.62rem] uppercase tracking-[0.26em] text-[rgba(194,186,176,0.62)]">
              <span>7-day trial path</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>No generic dashboard</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Built for GATE CSE</span>
            </div>

            <p className="mt-6 text-sm text-[rgba(194,186,176,0.72)]">
              Prefer dedicated signup?{" "}
              <Link href="/signup" className="text-[var(--ice)] hover:underline">
                Open signup page
              </Link>
            </p>
          </AuthCard>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 py-10 text-sm text-[rgba(194,186,176,0.72)]">
          Loading login...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
