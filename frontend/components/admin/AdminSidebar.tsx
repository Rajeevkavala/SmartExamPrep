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
} from "lucide-react";

import { adminApi } from "@/lib/api";

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
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 px-4 py-6 backdrop-blur-sm">
      <div className="px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          SmartExamPrep
        </p>
        <h2 className="mt-1 text-lg font-semibold text-indigo-300">Admin Panel</h2>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-950/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>

              {item.label === "Questions" && unverifiedCount > 0 ? (
                <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {unverifiedCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
