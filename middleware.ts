import { NextResponse, type NextRequest } from 'next/server';
import { getTenantIdFromHost } from './src/lib/tenant';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitBuckets = new Map<string, number[]>();

const PROTECTED_API_PREFIXES = ['/api/orders', '/api/inventory', '/api/notifications', '/api/locations', '/api/audit'];
const PUBLIC_API_PREFIXES = ['/api/health'];
const STATE_CHANGING_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

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

async function getDjangoSession(cookieHeader: string, tenantSlug: string) {
  const DJANGO_BACKEND_URL = process.env.DJANGO_BACKEND_URL ?? 'http://127.0.0.1:8000';
  try {
    const res = await fetch(`${DJANGO_BACKEND_URL}/api/auth/session/`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.session || null;
    }
  } catch (err) {
    console.error('Error fetching Django session in middleware:', err);
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenantSlug = getTenantIdFromHost(request.headers.get('host') ?? undefined);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-tenant-slug', tenantSlug);

  const cookieHeader = request.headers.get('cookie') || '';
  const session = await getDjangoSession(cookieHeader, tenantSlug);

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
      if (requestedWith !== 'XMLHttpRequest') {
        return NextResponse.json(
          { data: null, error: 'CSRF validation failed', meta: {} },
          { status: 403 }
        );
      }
    }

    if (isProtectedApiPath(pathname) && !session) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized', meta: {} },
        { status: 401 }
      );
    }
  }

  if (
    !isApiPath(pathname) &&
    pathname !== '/login' &&
    pathname !== '/signin' &&
    pathname !== '/signup' &&
    pathname !== '/auth/callback' &&
    pathname !== '/reset-password'
  ) {
    if (!session && pathname !== '/') {
      const redirect = NextResponse.redirect(new URL('/login', request.url));
      redirect.headers.set('x-tenant-slug', tenantSlug);
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!favicon.ico|_next|static).*)'],
};
