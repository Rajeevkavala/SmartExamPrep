import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

type DecodedToken = {
  role?: "student" | "admin";
};

const STUDENT_GUARDED_PATHS = ["/dashboard", "/quiz", "/revision", "/onboarding"];

const redirectTo = (request: NextRequest, path: string) =>
  NextResponse.redirect(new URL(path, request.url));

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return redirectTo(request, "/login");
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.role !== "admin") {
        return redirectTo(request, "/dashboard");
      }
    } catch {
      return redirectTo(request, "/login");
    }
  }

  const isStudentProtectedRoute = STUDENT_GUARDED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isStudentProtectedRoute && !token) {
    return redirectTo(request, "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/quiz/:path*",
    "/revision/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};