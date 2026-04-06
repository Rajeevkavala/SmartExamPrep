import type { ReactNode } from "react";

import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="admin-theme relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <div className="app-grid pointer-events-none fixed inset-0 opacity-[0.04]" />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,82,10,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,212,255,0.1),transparent_28%)]" />
        <AdminSidebar />
        <main className="relative ml-[272px] min-h-screen px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
