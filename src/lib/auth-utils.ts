import type { Database } from './database.types';
import type { User } from '@supabase/supabase-js';

export type UserRole = Database['public']['Enums']['user_role'];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 6,
  manager: 5,
  cashier: 4,
  kitchen: 3,
  waiter: 2,
  customer: 1,
};

export function hasRoleAccess(userRole: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.some((role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]);
}

export function resolvePostLoginRoute(user: User | { app_metadata?: { role?: string }; user_metadata?: { role?: string } } | null | undefined) {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role ?? 'customer';

  switch (role) {
    case 'manager':
    case 'admin':
      return '/dashboard';
    case 'cashier':
      return '/pos';
    case 'kitchen':
      return '/kitchen';
    default:
      return '/dashboard';
  }
}
