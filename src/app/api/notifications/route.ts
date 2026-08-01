import { requireAuth, resolveTenantSlugFromHost, createServerSupabase } from '../../../lib/auth';
import { logInfo, logError } from '../../../lib/logger';
import { notificationSchema } from '../../../lib/validators';
import { requireRole } from '../../../lib/access';
import { apiResponse } from '../../../lib/response';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenant_slug') ?? request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (error) {
    logError('Failed to fetch notifications', { error: error.message, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  return apiResponse(data ?? [], null, { total: data?.length ?? 0 });
}

export async function POST(request: Request) {
  const { supabase, session } = await requireAuth();
  const body = await request.json();
  const parsed = notificationSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse(null, 'Validation failed', { fields: parsed.error.flatten().fieldErrors }, 422);
  }

  const tenantSlug = parsed.data.tenant_slug ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager']);

  const { data, error } = await supabase.from('notifications').insert({
    tenant_slug: tenantSlug,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    read: false
  } as never).select('*').single();

  if (error || !data) {
    logError('Failed to create notification', { error: error?.message, tenantSlug });
    return apiResponse(null, error?.message ?? 'Could not create notification', {}, 500);
  }

  const notification = data as { id: string; [key: string]: unknown };
  logInfo('Notification created', { notificationId: notification.id, tenantSlug });
  return apiResponse(notification, null, {}, 201);
}

export async function PATCH(request: Request) {
  const { supabase, session } = await requireAuth();
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];
  const read = Boolean(body.read);

  const tenantSlug = request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager', 'cashier', 'waiter']);

  if (!ids.length) {
    return apiResponse(null, 'No notification IDs provided.', {}, 422);
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read } as never)
    .in('id', ids)
    .eq('tenant_slug', tenantSlug);

  if (error) {
    logError('Failed to update notifications', { error: error.message, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  const updatedNotifications = data as unknown[] | null;
  return apiResponse({ updated: updatedNotifications?.length ?? 0 }, null, {});
}
