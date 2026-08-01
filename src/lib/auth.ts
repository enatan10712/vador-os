import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './database.types';
import { getTenantIdFromHost } from './tenant';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export type { UserRole } from './auth-utils';
export { hasRoleAccess, resolvePostLoginRoute, ROLE_HIERARCHY } from './auth-utils';

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers can run in read-only contexts during rendering.
        }
      },
    },
  });
}

export async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData?.session) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return { supabase, session: sessionData.session };
}

export function resolveTenantSlugFromHost(host?: string) {
  return getTenantIdFromHost(host);
}

export function resolveTenantSlugFromRequest(request: { headers: Headers }) {
  return request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
}
