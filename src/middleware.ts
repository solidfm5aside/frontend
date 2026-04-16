import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side auth middleware.
 * Protects /admin/* routes before the page renders, eliminating the
 * client-side hydration flash that previously occurred on unauthorized access.
 *
 * Reads the presence of an auth token from cookies. The actual token
 * validation happens in the API; this guard just prevents unauthenticated
 * users from even seeing the admin shell.
 */
export function middleware(request: NextRequest) {
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
