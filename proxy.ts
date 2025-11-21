import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const authRoutes = ['/sign-in', '/sign-up'];
const protectedRoutes = ['/lookout', '/xql', '/settings'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Pathname: ', pathname);
  if (pathname === '/api/search') return NextResponse.next();
  if (pathname.startsWith('/new') || pathname.startsWith('/api/search')) {
    return NextResponse.next();
  }

  // Payment/subscription webhooks removed - no longer needed

  if (pathname.startsWith('/api/raycast')) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // Allow /settings as a real page; still protect it behind auth
  if (pathname === '/settings') {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.next();
  }

  // If user is authenticated but trying to access auth routes
  if (sessionCookie && authRoutes.some((route) => pathname.startsWith(route))) {
    console.log('Redirecting to home');
    console.log('Session cookie: ', sessionCookie);
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!sessionCookie && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
