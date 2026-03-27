import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply iframe-friendly headers to all /widgets/* routes
  if (pathname.startsWith('/widgets/')) {
    const response = NextResponse.next();
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors https://*.sharepoint.com https://*.microsoft.com https://lexkpi.app http://localhost:*"
    );
    response.headers.set('X-Frame-Options', 'ALLOW-FROM https://*.sharepoint.com');
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return response;
  }

  // Apply iframe headers to widget API routes too
  if (pathname.startsWith('/api/kpi/')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/widgets/:path*', '/api/kpi/:path*'],
};
