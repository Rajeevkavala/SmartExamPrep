"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { readAuthToken } from "@/lib/authToken";
import {
  isOnboardingComplete,
  type AuthUser,
  type UserRole,
  useAuthStore,
} from "@/store/authStore";

type StudentRouteGuardProps = {
  children: ReactNode;
};

export default function StudentRouteGuard({
  children,
}: StudentRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const syncSession = useAuthStore((state) => state.syncSession);

  const [isMounted, setIsMounted] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [hasAttemptedProfileHydration, setHasAttemptedProfileHydration] =
    useState(false);

  const activeToken = token ?? readAuthToken();
  const effectiveRole = role ?? user?.role ?? null;
  const onboardingComplete = isOnboardingComplete(user);
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const shouldHideProtectedContent =
    Boolean(user) &&
    ((effectiveRole === "admin") ||
      (!isOnboardingPath && !onboardingComplete) ||
      (isOnboardingPath && onboardingComplete));

  useEffect(() => {
    setIsMounted(true);
    syncSession();
  }, [syncSession]);

  useEffect(() => {
    if (!isMounted || !activeToken || user || isFetchingProfile) {
      return;
    }

    let isActive = true;
    setHasAttemptedProfileHydration(true);
    setIsFetchingProfile(true);

    void api
      .get<AuthUser>("/auth/me")
      .then(({ data }) => {
        if (!isActive) {
          return;
        }

        setAuth(activeToken, (data.role ?? role ?? "student") as UserRole, data);
      })
      .catch(() => {
        // Shared axios interceptors handle auth failures globally.
      })
      .finally(() => {
        if (isActive) {
          setIsFetchingProfile(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeToken, isFetchingProfile, isMounted, role, setAuth, user]);

  useEffect(() => {
    if (!isMounted || isFetchingProfile) {
      return;
    }

    if (effectiveRole === "admin") {
      router.replace("/admin");
      return;
    }

    if (!activeToken) {
      router.replace("/login");
      return;
    }

    if (isOnboardingPath) {
      if (onboardingComplete) {
        const postOnboardingRedirect =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("post-onboarding-redirect")
            : null;

        if (postOnboardingRedirect) {
          window.sessionStorage.removeItem("post-onboarding-redirect");
          router.replace(postOnboardingRedirect);
          return;
        }

        router.replace("/dashboard");
      }
      return;
    }

    if (!onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [
    activeToken,
    effectiveRole,
    isFetchingProfile,
    isMounted,
    isOnboardingPath,
    onboardingComplete,
    pathname,
    router,
  ]);

  if (
    !isMounted ||
    (isMounted && !activeToken) ||
    (activeToken && !user && (!hasAttemptedProfileHydration || isFetchingProfile)) ||
    (isMounted && !isFetchingProfile && shouldHideProtectedContent)
  ) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8">
        <LoadingSpinner message="Checking your study profile..." />
      </main>
    );
  }

  return <>{children}</>;
}
