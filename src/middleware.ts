import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    if (!token) return NextResponse.next();

    const role = token.role as string;

    // ADMIN has full access
    if (role === "ADMIN") {
      return NextResponse.next();
    }

    // ADMINISTRATION has full access EXCEPT users configuration
    if (role === "ADMINISTRATION") {
      if (path.startsWith("/configuracion/usuarios")) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // WEIGHER only has access to /operaciones/lotes and /operaciones/faena
    // And possibly the root / dashboard
    if (role === "WEIGHER") {
      if (path === "/") {
        return NextResponse.next();
      }
      
      const allowedPaths = [
        "/operaciones/lotes",
        "/operaciones/faena",
        "/api/" // allow api calls
      ];

      const isAllowed = allowedPaths.some(allowedPath => path.startsWith(allowedPath));

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
