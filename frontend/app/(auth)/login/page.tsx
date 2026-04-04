"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { api } from "@/lib/api";
import { loginSchema, registerSchema } from "@/lib/validations";
import type { AuthUser } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type AuthMode = "login" | "register";

type LoginResponse = {
  access_token: string;
  role: "admin" | "student";
};

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
      router.push(data.role === "admin" ? "/admin" : "/dashboard");
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60 backdrop-blur-md">
        <h1 className="text-center text-2xl font-semibold text-white">
          SmartExamPrep
        </h1>
        <p className="mt-1 text-center text-sm text-slate-300">
          Continue your AI-powered prep journey
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "register"
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email ? (
                <p className="mt-1 text-xs text-red-300">
                  {loginForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-300">
                  {loginForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loginForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit}>
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="full_name"
              >
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
                {...registerForm.register("full_name")}
              />
              {registerForm.formState.errors.full_name ? (
                <p className="mt-1 text-xs text-red-300">
                  {registerForm.formState.errors.full_name.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="register_email"
              >
                Email
              </label>
              <input
                id="register_email"
                type="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
                {...registerForm.register("email")}
              />
              {registerForm.formState.errors.email ? (
                <p className="mt-1 text-xs text-red-300">
                  {registerForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="register_password"
              >
                Password
              </label>
              <input
                id="register_password"
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-300">
                  {registerForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {registerForm.formState.isSubmitting
                ? "Creating account..."
                : "Create Account"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 px-4 py-10 text-sm text-slate-300">
          Loading login...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
