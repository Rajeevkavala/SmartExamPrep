"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  Map,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isPro?: boolean;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    href: "/exams",
    label: "Exams",
    icon: BookOpen,
    match: (pathname) => pathname.startsWith("/exams"),
  },
  {
    href: "/predict",
    label: "AI Predictor",
    icon: BrainCircuit,
    match: (pathname) => pathname.startsWith("/predict"),
  },
  {
    href: "/roadmap",
    label: "My Roadmap",
    icon: Map,
    match: (pathname) => pathname.startsWith("/roadmap"),
  },
  {
    href: "/pyq",
    label: "PYQ Bank",
    icon: CircleHelp,
    match: (pathname) => pathname.startsWith("/pyq"),
  },
  {
    href: "/mock-tests",
    label: "Mock Tests",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/mock-tests"),
  },
  {
    href: "/upload",
    label: "PDF Upload",
    icon: Upload,
    isPro: true,
    match: (pathname) => pathname.startsWith("/upload"),
  },
  {
    href: "/chat",
    label: "AI Assistant",
    icon: MessageSquare,
    isPro: true,
    match: (pathname) => pathname.startsWith("/chat"),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: BarChart3,
    match: (pathname) => pathname.startsWith("/progress"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (pathname) => pathname.startsWith("/settings"),
  },
];

const routeMeta: Array<{ test: (pathname: string) => boolean; title: string }> = [
  { test: (pathname) => pathname.startsWith("/dashboard"), title: "DASHBOARD" },
  { test: (pathname) => pathname.startsWith("/exams"), title: "CHOOSE YOUR EXAM" },
  { test: (pathname) => pathname.startsWith("/predict"), title: "AI PREDICTOR" },
  { test: (pathname) => pathname.startsWith("/roadmap"), title: "MY ROADMAP" },
  { test: (pathname) => pathname.startsWith("/pyq"), title: "PYQ BANK" },
  { test: (pathname) => pathname.startsWith("/mock-tests"), title: "MOCK TESTS" },
  { test: (pathname) => pathname.startsWith("/quiz/adaptive"), title: "MOCK TEST SESSION" },
  { test: (pathname) => pathname.startsWith("/quiz"), title: "QUIZ" },
  { test: (pathname) => pathname.startsWith("/upload"), title: "PDF UPLOAD" },
  { test: (pathname) => pathname.startsWith("/chat"), title: "AI ASSISTANT" },
  { test: (pathname) => pathname.startsWith("/progress"), title: "PROGRESS" },
  { test: (pathname) => pathname.startsWith("/settings"), title: "SETTINGS" },
  { test: (pathname) => pathname.startsWith("/profile"), title: "PROFILE" },
  { test: (pathname) => pathname.startsWith("/planner"), title: "PLANNER" },
  { test: (pathname) => pathname.startsWith("/revision"), title: "REVISION" },
  { test: (pathname) => pathname.startsWith("/feedback"), title: "FEEDBACK" },
  { test: (pathname) => pathname.startsWith("/onboarding"), title: "ONBOARDING" },
];

const examTracks = [
  "GATE Computer Science",
  "GATE Data Science",
  "GATE Electrical",
];

function SidebarContent({
  pathname,
  collapsed,
  selectedTrack,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  selectedTrack: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[58px] items-center border-b border-[rgba(240,232,218,0.08)] px-4">
        <div className="flex h-8 w-8 items-center justify-center bg-[var(--fire)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        {!collapsed ? (
          <p className="ml-3 font-display text-[1.85rem] leading-none tracking-[0.04em] text-[var(--cream)]">
            SMARTEXAMPREP
          </p>
        ) : null}
      </div>

      <div className="border-b border-[rgba(240,232,218,0.08)] px-3 py-4">
        {!collapsed ? (
          <p className="mb-2 font-mono text-[0.56rem] uppercase tracking-[0.24em] text-[rgba(194,186,176,0.48)]">
            Exam Track
          </p>
        ) : null}
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center rounded-sm border border-[rgba(240,232,218,0.08)] bg-transparent px-3 text-left",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed ? (
            <span className="truncate text-sm text-[var(--cream)]">{selectedTrack}</span>
          ) : (
            <BookOpen className="h-4 w-4 text-[var(--cream)]" />
          )}
          {!collapsed ? (
            <ChevronDown className="h-4 w-4 text-[rgba(194,186,176,0.66)]" />
          ) : null}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-11 items-center rounded-sm px-3 transition",
                active
                  ? "border-l-2 border-[var(--fire)] bg-[rgba(232,82,10,0.24)] text-[var(--cream)]"
                  : "text-[rgba(240,232,218,0.86)] hover:bg-[rgba(232,82,10,0.1)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? (
                <span className="ml-3 text-base leading-none">{item.label}</span>
              ) : null}
              {!collapsed && item.isPro ? (
                <span className="ml-auto rounded-full bg-[rgba(232,82,10,0.28)] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-[var(--fire2)]">
                  Pro
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[rgba(240,232,218,0.08)] p-3">
        <div className="flex h-10 items-center rounded-sm bg-[rgba(232,82,10,0.3)] px-3 text-[var(--cream)]">
          <Crown className="h-4 w-4" />
          {!collapsed ? <span className="ml-2 text-base">PRO</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(examTracks[0]);

  useEffect(() => {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem("student-shell-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }

    const storedTrack = typeof window === "undefined" ? null : window.localStorage.getItem("student-shell-track");
    if (storedTrack && examTracks.includes(storedTrack)) {
      setSelectedTrack(storedTrack);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("student-shell-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("student-shell-track", selectedTrack);
  }, [selectedTrack]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const pageTitle = useMemo(
    () => routeMeta.find((item) => item.test(pathname))?.title ?? "STUDENT WORKSPACE",
    [pathname]
  );

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Client-side auth cleanup is still the source of truth if the logout request fails.
    }
    logout();
    router.push("/login");
  };

  const initials = useMemo(() => {
    if (!user?.full_name) {
      return "R";
    }

    const parts = user.full_name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return "R";
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [user?.full_name]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "relative hidden shrink-0 border-r border-[rgba(240,232,218,0.08)] bg-[rgba(5,5,8,0.96)] lg:flex",
            collapsed ? "w-[86px]" : "w-[250px]"
          )}
        >
          <SidebarContent
            pathname={pathname}
            collapsed={collapsed}
            selectedTrack={selectedTrack}
          />

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="absolute -right-5 top-20 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(240,232,218,0.08)] bg-[rgba(12,12,16,0.95)] text-[rgba(194,186,176,0.72)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        <div
          className={cn(
            "fixed inset-0 z-50 transition lg:hidden",
            mobileOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-black/70 transition",
              mobileOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-[88vw] max-w-[280px] border-r border-[rgba(240,232,218,0.08)] bg-[rgba(5,5,8,0.98)] transition duration-300",
              mobileOpen ? "translate-x-0" : "-translate-x-[110%]"
            )}
          >
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              selectedTrack={selectedTrack}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-[58px] items-center justify-between border-b border-[rgba(240,232,218,0.08)] bg-[rgba(6,6,10,0.95)] px-3 md:px-5 lg:px-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-9 w-9 items-center justify-center border border-[rgba(240,232,218,0.08)] text-[var(--cream)] lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="font-display text-[2.15rem] leading-none tracking-[0.02em] text-[var(--cream)] md:text-[2.45rem]">
                {pageTitle}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden items-center gap-3 xl:flex">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrack((current) => {
                      const index = examTracks.indexOf(current);
                      const nextIndex = (index + 1) % examTracks.length;
                      return examTracks[nextIndex];
                    });
                  }}
                  className="flex h-10 min-w-[200px] items-center justify-between border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[var(--cream)]"
                >
                  <span className="truncate">{selectedTrack}</span>
                  <ChevronDown className="ml-2 h-4 w-4 text-[rgba(194,186,176,0.66)]" />
                </button>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(194,186,176,0.48)]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="h-10 w-[270px] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] pl-11 pr-4 text-sm text-[var(--cream)] outline-none placeholder:text-[rgba(194,186,176,0.45)]"
                  />
                </label>
              </div>

              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.72)] sm:flex"
                aria-label="Theme"
              >
                <Moon className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="relative hidden h-10 w-10 items-center justify-center border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.72)] sm:flex"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--fire)]" />
              </button>

              <Link
                href="/profile"
                className="flex h-10 items-center gap-2 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-3 text-[var(--cream)]"
              >
                <span className="flex h-6 w-6 items-center justify-center bg-[rgba(232,82,10,0.25)] text-xs font-semibold uppercase">
                  {initials}
                </span>
                <span className="hidden max-w-[150px] truncate text-sm md:block">
                  {user?.full_name ?? "Rajeev Kavala"}
                </span>
                <ChevronDown className="h-4 w-4 text-[rgba(194,186,176,0.66)]" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="hidden h-10 w-10 items-center justify-center border border-[rgba(240,232,218,0.08)] text-[rgba(194,186,176,0.72)] lg:flex"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="px-3 pb-8 pt-5 md:px-5 lg:px-7">{children}</main>
        </div>
      </div>
    </div>
  );
}

