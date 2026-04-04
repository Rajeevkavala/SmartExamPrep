import type { ReactNode } from "react";

import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <AdminSidebar />
        <main className="ml-64 min-h-screen px-6 py-8 lg:px-8">{children}</main>
      </div>
    </AdminGuard>
  );
}
