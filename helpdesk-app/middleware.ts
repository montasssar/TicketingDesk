import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("helpdesk_token");
    const isAuthPage = request.nextUrl.pathname.startsWith("/login");

    // If user has no token and tries to access protected routes
    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If user has token and tries to access login page
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/tickets/:path*",
        "/login",
    ],
};
