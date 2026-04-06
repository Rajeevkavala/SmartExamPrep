"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  fireButtonClass,
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

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <section className={cn(panelClass, "app-noise w-full p-7 sm:p-8")}>
          <StatusBadge tone="fire">New account</StatusBadge>
          <h1 className="mt-5 font-display text-5xl leading-none tracking-[0.08em] text-[var(--cream)]">
            CREATE YOUR STUDY ACCOUNT
          </h1>
          <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.74)]">
            Register to unlock the adaptive dashboard, roadmap, planner, PYQ practice,
            and grounded AI study chat.
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

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={cn(fireButtonClass, "w-full justify-center")}
            >
              {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[rgba(194,186,176,0.72)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--ice)] hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
