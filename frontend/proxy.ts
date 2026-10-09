import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./app/lib/session-cookie";

/** Sends visitors without a session cookie to the login page. The API still checks the session. */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/account/:path*", "/story/:path*"]
};
