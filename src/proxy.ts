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
  const accessCookie = request.cookies.get('sfm_access')?.value;
  // This marker contains no credentials. It only lets the client attempt the
  // authoritative /auth/me + refresh flow after the short access cookie expires.
  const sessionMarker = request.cookies.get('admin_session')?.value;

  if (pathname === '/admin' && (accessCookie || sessionMarker)) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // /admin is the public portal landing page. Protect dashboard routes below it.
  if (pathname.startsWith('/admin/')) {
    if (!accessCookie && !sessionMarker) {
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
  matcher: ['/admin', '/admin/:path*'],
};
