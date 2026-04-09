"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { readAuthToken } from "@/lib/authToken";
import type { UserRole } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";

type PersistedAuthShape = {
  state?: {
    role?: UserRole | null;
  };
};

type AdminGuardProps = {
  children: ReactNode;
};

const getStoredRole = (): UserRole | null => {
  try {
    const serialized = localStorage.getItem("auth-store");
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as PersistedAuthShape;
    const role = parsed?.state?.role;
    return role === "admin" || role === "student" ? role : null;
  } catch {
    return null;
  }
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const syncSession = useAuthStore((state) => state.syncSession);

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    syncSession();

    const resolvedToken = token || readAuthToken();
    const resolvedRole = role ?? getStoredRole();

    if (!resolvedToken) {
      router.replace("/login");
      return;
    }

    if (resolvedRole !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setIsAuthorized(true);
    setIsChecking(false);
  }, [role, router, syncSession, token]);

  if (isChecking || !isAuthorized) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8">
        <LoadingSpinner message="Validating admin access..." />
      </main>
    );
  }

  return <>{children}</>;
}
