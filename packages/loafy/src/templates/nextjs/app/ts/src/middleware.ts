import { MiddlewareConfig, type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  /* middleware function here */

  return NextResponse.next();
}

export const config: MiddlewareConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|static/).*)",
  ],
};
