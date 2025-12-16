import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isChangePasswordPage = req.nextUrl.pathname === '/auth/change-password';

    if (isAuth) {
        // Check for Force Password Change
        if (token?.isTemporaryPassword && !isChangePasswordPage) {
             return NextResponse.redirect(new URL('/auth/change-password', req.url));
        }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
        signIn: '/auth/login',
    }
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|api/register|auth/login|_next/static|_next/image|favicon.ico|mv_logo.png).*)',
  ],
};
