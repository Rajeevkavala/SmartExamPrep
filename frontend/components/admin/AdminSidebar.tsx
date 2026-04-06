"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Bug,
  CircleHelp,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/subjects", label: "Subjects", icon: BookOpenText },
  { href: "/admin/questions", label: "Questions", icon: CircleHelp },
  { href: "/admin/scraper", label: "Scraper", icon: Bug },
  { href: "/admin/syllabus", label: "Syllabus", icon: FileText },
];

const isLinkActive = (pathname: string, href: string) => {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  const activeHref = useMemo(
    () => navItems.find((item) => isLinkActive(pathname, item.href))?.href,
    [pathname]
  );

  useEffect(() => {
    let cancelled = false;

    const loadUnverifiedCount = async () => {
      try {
        const { data } = await adminApi.get<{ total?: number }>("/questions/", {
          params: {
            is_verified: false,
            limit: 1,
          },
        });

        if (!cancelled) {
          setUnverifiedCount(Number(data?.total ?? 0));
        }
      } catch {
        if (!cancelled) {
          setUnverifiedCount(0);
        }
      }
    };

    void loadUnverifiedCount();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <aside className="app-noise fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col border-r border-white/10 bg-[rgba(6,6,10,0.96)] px-4 py-6 backdrop-blur-xl">
      <div className="rounded-[22px] border border-[rgba(232,82,10,0.16)] bg-[rgba(232,82,10,0.08)] p-4">
        <p className="font-mono text-[0.56rem] uppercase tracking-[0.26em] text-[rgba(194,186,176,0.62)]">
          SmartExamPrep
        </p>
        <h2 className="mt-2 font-display text-4xl leading-none tracking-[0.08em] text-[var(--cream)]">
          ADMIN
        </h2>
        <p className="mt-2 text-xs text-[rgba(194,186,176,0.7)]">
          Content Ops Console
        </p>
      </div>

      <nav className="mt-7 flex flex-1 flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-sm transition",
                isActive
                  ? "border-[rgba(232,82,10,0.24)] bg-[rgba(232,82,10,0.24)] text-[var(--cream)]"
                  : "border-transparent text-[rgba(194,186,176,0.76)] hover:border-white/10 hover:bg-white/5 hover:text-[var(--cream)]"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>

              {item.label === "Questions" && unverifiedCount > 0 ? (
                <span className="ml-auto rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[0.62rem] font-semibold text-rose-200">
                  {unverifiedCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-[18px] border border-white/10 bg-white/4 p-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.1)]">
            <ShieldCheck className="h-4 w-4 text-[var(--ice)]" />
          </div>
          <div>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.56)]">
              Queue Health
            </p>
            <p className="mt-1 text-sm text-[rgba(194,186,176,0.76)]">
              {unverifiedCount > 0
                ? `${unverifiedCount} questions pending verification`
                : "No pending review items"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
