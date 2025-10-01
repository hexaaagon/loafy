import { NextResponse } from "next/server";

/** @param {import("next/server").NextRequest} request */
export async function middleware(request) {
  /* middleware function here */

  return NextResponse.next();
}

/** @type {import("next/server").MiddlewareConfig} */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|static/).*)",
  ],
};
