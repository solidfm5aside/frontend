import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side Edge Proxy (formerly Middleware).
 * Protects /admin/* routes before the page renders, eliminating the
 * client-side hydration flash that previously occurred on unauthorized access.
 *
 * This version follows the Next.js 16 'proxy' convention.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (pathname.startsWith('/admin')) {
    // Check for the auth token cookie set by the login flow
    const token = request.cookies.get('token')?.value 
      || request.headers.get('authorization');

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all admin routes but exclude Next.js internals and static assets.
   */
  matcher: ['/admin/:path*'],
};
