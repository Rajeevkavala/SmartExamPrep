import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

type DecodedToken = {
  role?: "student" | "admin";
  exp?: number;
};

const STUDENT_GUARDED_PATHS = [
  "/dashboard",
  "/chat",
  "/exams",
  "/feedback",
  "/mock-tests",
  "/planner",
  "/predict",
  "/profile",
  "/progress",
  "/pyq",
  "/quiz",
  "/revision",
  "/roadmap",
  "/settings",
  "/upload",
  "/onboarding",
];

const redirectTo = (request: NextRequest, path: string) =>
  NextResponse.redirect(new URL(path, request.url));

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;
  const isStudentProtectedRoute = STUDENT_GUARDED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  let decodedToken: DecodedToken | null = null;
  if (token) {
    try {
      decodedToken = jwtDecode<DecodedToken>(token);
      if (
        typeof decodedToken.exp === "number" &&
        decodedToken.exp <= Math.floor(Date.now() / 1000)
      ) {
        return redirectTo(request, "/login");
      }
    } catch {
      return redirectTo(request, "/login");
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return redirectTo(request, "/login");
    }

    if (decodedToken?.role !== "admin") {
      return redirectTo(request, "/dashboard");
    }
  }

  if (isStudentProtectedRoute && !token) {
    return redirectTo(request, "/login");
  }

  if (isStudentProtectedRoute && decodedToken?.role === "admin") {
    return redirectTo(request, "/admin");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/exams/:path*",
    "/feedback/:path*",
    "/mock-tests/:path*",
    "/planner/:path*",
    "/predict/:path*",
    "/profile/:path*",
    "/progress/:path*",
    "/pyq/:path*",
    "/quiz/:path*",
    "/revision/:path*",
    "/roadmap/:path*",
    "/settings/:path*",
    "/upload/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};
