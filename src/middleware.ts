import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './lib/database.types';
import { getSupabaseConfig } from './lib/supabaseConfig';
import { getTenantIdFromHost } from './lib/tenant';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitBuckets = new Map<string, number[]>();

const PROTECTED_API_PREFIXES = ['/api/orders', '/api/inventory', '/api/notifications', '/api/locations', '/api/audit'];
const PUBLIC_API_PREFIXES = ['/api/health'];
const STATE_CHANGING_METHODS = new Set(['POST', 'PATCH', 'DELETE']);
const PUBLIC_PAGE_PATHS = new Set(['/', '/login', '/signin', '/signup', '/auth/callback', '/reset-password']);

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

function rateLimit(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateLimitBuckets.get(ip)?.filter((timestamp) => timestamp > windowStart) ?? [];

  if (bucket.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = bucket[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000));
    rateLimitBuckets.set(ip, bucket);

    return {
      limited: true,
      retryAfterSeconds,
    };
  }

  bucket.push(now);
  rateLimitBuckets.set(ip, bucket);

  return { limited: false, retryAfterSeconds: 0 };
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

function isProtectedApiPath(pathname: string) {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenantSlug = getTenantIdFromHost(request.headers.get('host') ?? undefined);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  // Resolve Supabase config lazily inside the function so Vercel edge runtime
  // reads env vars at request time, not at module evaluation time.
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-tenant-slug', tenantSlug);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        response.headers.set('x-tenant-slug', tenantSlug);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Prefer getUser() so the auth token is validated/refreshed and cookies stay in sync.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (isApiPath(pathname)) {
    if (isPublicApiPath(pathname)) {
      return response;
    }

    const ip = getClientIp(request);
    const limit = rateLimit(ip);

    if (limit.limited) {
      const limitedResponse = NextResponse.json(
        { data: null, error: 'Too many requests', meta: {} },
        { status: 429 }
      );
      limitedResponse.headers.set('Retry-After', String(limit.retryAfterSeconds));
      limitedResponse.headers.set('x-tenant-slug', tenantSlug);
      return limitedResponse;
    }

    if (STATE_CHANGING_METHODS.has(request.method)) {
      const requestedWith = request.headers.get('x-requested-with');
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host') ?? '';
      
      // Allow same-origin requests (browser form submissions and fetch from same domain)
      // Allow requests with XMLHttpRequest header (explicit API clients)
      // Block cross-origin POST/PATCH/DELETE that lack both signals
      const isSameOrigin =
        (origin && (origin.includes(host) || origin.startsWith('http://localhost'))) ||
        (referer && (referer.includes(host) || referer.startsWith('http://localhost')));
      
      if (requestedWith !== 'XMLHttpRequest' && !isSameOrigin) {
        return NextResponse.json(
          { data: null, error: 'CSRF validation failed', meta: {} },
          { status: 403 }
        );
      }
    }

    if (isProtectedApiPath(pathname) && !user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized', meta: {} },
        { status: 401 }
      );
    }

    return response;
  }

  if (pathname === '/') {
    const destination = user ? '/dashboard' : '/login';
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    redirect.headers.set('x-tenant-slug', tenantSlug);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  if (!user && !PUBLIC_PAGE_PATHS.has(pathname)) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.headers.set('x-tenant-slug', tenantSlug);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!favicon.ico|_next|static).*)'],
};
