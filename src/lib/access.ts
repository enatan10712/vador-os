import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasRoleAccess } from './auth';

export type UserRole = Database['public']['Enums']['user_role'];

export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantSlug: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_slug', tenantSlug)
    .single();

  if (error) {
    throw new Error(`Could not load user profile: ${error.message}`);
  }

  return data as Database['public']['Tables']['profiles']['Row'];
}

export async function requireRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantSlug: string,
  allowedRoles: UserRole[]
) {
  const profile = await getUserProfile(supabase, userId, tenantSlug);

  if (!profile || !hasRoleAccess(profile.role as UserRole, allowedRoles)) {
    throw new Response('Forbidden', { status: 403 });
  }

  return profile;
}
