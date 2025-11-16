import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes
  const publicRoutes = ["/", "/login", "/signup", "/courses"];
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith("/courses/")
  );

  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      // Redirecionar usuário autenticado baseado no role
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      } else if (userRole === "INSTRUCTOR") {
        return NextResponse.redirect(new URL("/instructor", req.url));
      } else {
        return NextResponse.redirect(new URL("/student/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // Protected admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Protected instructor routes
  if (pathname.startsWith("/instructor")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (userRole !== "INSTRUCTOR" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Protected student routes
  if (pathname.startsWith("/student")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
