"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { registerSchema } from "@/lib/validations";

type RegisterFormValues = z.infer<typeof registerSchema>;

function SignupPromo() {
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
              Student launch bay
            </p>
          </div>
        </div>

        <h2 className="mt-10 font-display text-[4.1rem] leading-[0.88] tracking-[0.08em] text-[var(--cream)]">
          BUILD A SHARP START FROM DAY ONE.
        </h2>
        <p className="mt-6 max-w-lg font-serif text-2xl italic leading-9 text-[rgba(194,186,176,0.84)]">
          Your account unlocks the diagnostic, roadmap, planner, revision loop, and grounded AI chat in one connected flow.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,212,255,0.18)] bg-[rgba(0,212,255,0.08)]">
              <ShieldCheck className="h-4 w-4 text-[var(--ice)]" />
            </div>
            <p className="text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              No throwaway onboarding. We map your current state and immediately route you to targeted next actions.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(232,82,10,0.22)] bg-[rgba(232,82,10,0.08)]">
              <Target className="h-4 w-4 text-[var(--fire)]" />
            </div>
            <p className="text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              Study direction stays synchronized across roadmap, planner, and revision so effort compounds each week.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await api.post("/auth/register", values);
      toast({
        title: "Account created",
        description: "You can now sign in and begin your onboarding flow.",
      });
      router.push("/login?mode=login");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to create account right now.";
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: message,
      });
    }
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,82,10,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,212,255,0.12),transparent_24%)]" />
      <div className="app-grid pointer-events-none absolute inset-0 opacity-[0.05]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1400px] gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <SignupPromo />

        <div className="flex items-center justify-center">
          <section className={cn(panelClass, "app-noise w-full max-w-xl p-7 sm:p-8")}>
            <StatusBadge tone="fire">New account</StatusBadge>
            <h1 className="mt-5 font-display text-5xl leading-none tracking-[0.08em] text-[var(--cream)]">
              CREATE YOUR STUDY ACCOUNT
            </h1>
            <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
              Register once and continue inside a single adaptive system built for GATE prep.
            </p>

            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <div>
                <label className={monoLabelClass} htmlFor="signup_full_name">
                  Full Name
                </label>
                <input
                  id="signup_full_name"
                  type="text"
                  className={cn(inputClass, "mt-3")}
                  {...form.register("full_name")}
                />
                {form.formState.errors.full_name ? (
                  <p className="mt-2 text-xs text-rose-300">
                    {form.formState.errors.full_name.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={monoLabelClass} htmlFor="signup_email">
                  Email
                </label>
                <input
                  id="signup_email"
                  type="email"
                  className={cn(inputClass, "mt-3")}
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="mt-2 text-xs text-rose-300">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={monoLabelClass} htmlFor="signup_password">
                  Password
                </label>
                <input
                  id="signup_password"
                  type="password"
                  className={cn(inputClass, "mt-3")}
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="mt-2 text-xs text-rose-300">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className={cn(fireButtonClass, "w-full justify-center")}
                >
                  {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
                </button>
                <Link href="/login" className={cn(ghostButtonClass, "w-full justify-center")}>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </form>

            <p className="mt-6 text-sm text-[rgba(194,186,176,0.72)]">
              Prefer the combined auth screen?{" "}
              <Link href="/login?mode=register" className="text-[var(--ice)] hover:underline">
                Open register mode
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
