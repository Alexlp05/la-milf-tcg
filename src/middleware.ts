import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Admin only
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // PENDING/BANNED cannot open packs -> waiting
    if (path.startsWith('/open-pack') && token?.status && token.status !== 'APPROVED') {
      return NextResponse.redirect(new URL('/waiting-approval', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public pages
        if (path.startsWith('/login') || path.startsWith('/auth') || path.startsWith('/waiting-approval')) return true;
        if (path.startsWith('/admin')) return (token as any)?.role === 'ADMIN';
        if (path.startsWith('/open-pack') || path.startsWith('/collection')) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/open-pack/:path*', '/collection/:path*'],
};