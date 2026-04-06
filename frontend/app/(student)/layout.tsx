import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import StudentRouteGuard from "@/components/student/StudentRouteGuard";

export default function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <StudentRouteGuard>
      <AppShell>{children}</AppShell>
    </StudentRouteGuard>
  );
}
