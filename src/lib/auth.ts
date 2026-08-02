import { cookies } from 'next/headers';
import { getTenantIdFromHost } from './tenant';

export type { UserRole } from './auth-utils';
export { hasRoleAccess, resolvePostLoginRoute, ROLE_HIERARCHY } from './auth-utils';

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
    console.error('Error fetching Django session:', err);
  }
  return null;
}

export async function requireAuth() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const tenantSlug = 'robusta-coffee'; // fallback
  const session = await getDjangoSession(cookieHeader, tenantSlug);

  if (!session) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return { session };
}

export function resolveTenantSlugFromHost(host?: string) {
  return getTenantIdFromHost(host);
}

export function resolveTenantSlugFromRequest(request: { headers: Headers }) {
  return request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
}
