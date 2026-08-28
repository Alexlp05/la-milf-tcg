import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (path.startsWith('/open-pack') && token?.status !== 'APPROVED') {
      return NextResponse.redirect(new URL('/waiting-approval', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/admin')) return token?.role === 'ADMIN';
        if (path.startsWith('/open-pack') || path.startsWith('/collection')) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/open-pack/:path*', '/collection/:path*'],
};