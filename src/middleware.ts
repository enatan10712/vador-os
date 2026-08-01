import { NextResponse, type NextRequest } from 'next/server';
import { getTenantIdFromHost } from './lib/tenant';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitBuckets = new Map<string, number[]>();

const PUBLIC_API_PREFIXES = ['/api/health'];
const STATE_CHANGING_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

// Pages that don't require authentication — everyone can visit these
const PUBLIC_PAGE_PATHS = new Set([
  '/login',
  '/signin',
  '/signup',
  '/reset-password',
]);

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function rateLimit(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket =
    rateLimitBuckets.get(ip)?.filter((t) => t > windowStart) ?? [];

  if (bucket.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = bucket[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    );
    rateLimitBuckets.set(ip, bucket);
    return { limited: true, retryAfterSeconds };
  }

  bucket.push(now);
  rateLimitBuckets.set(ip, bucket);
  return { limited: false, retryAfterSeconds: 0 };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenantSlug = getTenantIdFromHost(
    request.headers.get('host') ?? undefined
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-tenant-slug', tenantSlug);

  // ── Auth callback: pass through so the route handler can exchange the code ──
  if (pathname.startsWith('/auth/')) {
    return response;
  }

  // ── Root redirect ──
  if (pathname === '/') {
    const redirect = NextResponse.redirect(
      new URL('/login', request.url)
    );
    redirect.headers.set('x-tenant-slug', tenantSlug);
    return redirect;
  }

  // ── API routes ──
  if (pathname.startsWith('/api/')) {
    // Public API — no auth needed
    if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return response;
    }

    // Rate limiting
    const ip = getClientIp(request);
    const limit = rateLimit(ip);
    if (limit.limited) {
      const r = NextResponse.json(
        { data: null, error: 'Too many requests', meta: {} },
        { status: 429 }
      );
      r.headers.set('Retry-After', String(limit.retryAfterSeconds));
      r.headers.set('x-tenant-slug', tenantSlug);
      return r;
    }

    // CSRF — same-origin check for state-changing methods
    if (STATE_CHANGING_METHODS.has(request.method)) {
      const requestedWith = request.headers.get('x-requested-with');
      const origin = request.headers.get('origin') ?? '';
      const referer = request.headers.get('referer') ?? '';
      const host = request.headers.get('host') ?? '';

      const isSameOrigin =
        origin.includes(host) ||
        origin.startsWith('http://localhost') ||
        referer.includes(host) ||
        referer.startsWith('http://localhost');

      if (requestedWith !== 'XMLHttpRequest' && !isSameOrigin) {
        return NextResponse.json(
          { data: null, error: 'CSRF validation failed', meta: {} },
          { status: 403 }
        );
      }
    }

    // Protected API routes session checks are handled securely in Django backend.
    return response;
  }

  // ── Page routes ──
  // Public pages: just pass through
  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return response;
  }

  // All other pages: pass through and let the client-side DashboardGuard handle auth.
  // This avoids the asymmetric JWT verification issue in middleware where getSession()
  // can return null immediately after the OAuth callback even with a valid cookie.
  return response;
}

export const config = {
  matcher: ['/((?!favicon.ico|_next|static|.*\\..*).*)'],
};
