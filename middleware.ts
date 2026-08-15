import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '@/lib/admin-auth';

const rewrites = {
  '/admin/avdb-import-test': '/avdb-import-test',
  '/admin/bulk-player-test': '/bulk-player-test',
  '/admin/player-extractor': '/player-extractor',
  '/admin/embed-test': '/embed-test',
};
const protectedTools = ['/avdb-import-test', '/bulk-player-test', '/player-extractor', '/embed-test'];

async function isAuthorized(request) {
  const expected = await createAdminSessionToken();
  const provided = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return Boolean(expected && provided === expected);
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const needsAuth = pathname === '/admin' || pathname.startsWith('/admin/') || protectedTools.includes(pathname);
  if (needsAuth && !(await isAuthorized(request))) {
    const login = new URL('/admin/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  if (rewrites[pathname]) {
    const destination = new URL(rewrites[pathname], request.url);
    destination.search = search;
    return NextResponse.rewrite(destination);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/avdb-import-test', '/bulk-player-test', '/player-extractor', '/embed-test'],
};
