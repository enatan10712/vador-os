import { parsePaginationParams, validateBody } from '../../../lib/api';
import { requireAuth, resolveTenantSlugFromRequest } from '../../../lib/auth';
import { logError, logInfo } from '../../../lib/logger';
import { apiResponse } from '../../../lib/response';
import { locationSchema } from '../../../lib/validators';
import { requireRole } from '../../../lib/access';

export async function GET(request: Request) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromRequest(request);
  const url = new URL(request.url);
  const pagination = parsePaginationParams(url);
  const isActive = url.searchParams.get('isActive');

  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager', 'cashier', 'kitchen', 'waiter']);

  let query = supabase
    .from('locations')
    .select('*', { count: 'exact' })
    .eq('tenant_slug', tenantSlug)
    .is('deleted_at', null);

  if (isActive === 'true') {
    query = query.eq('is_active', true);
  } else if (isActive === 'false') {
    query = query.eq('is_active', false);
  }

  const { data, count, error } = await query
    .order(pagination.sortBy, { ascending: pagination.sortDir === 'asc' })
    .range(pagination.from, pagination.to);

  if (error) {
    logError('Failed to fetch locations', { error: error.message, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  return apiResponse(data ?? [], null, {
    total: count ?? 0,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });
}

export async function POST(request: Request) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromRequest(request);
  const payload = await request.json();
  const validated = validateBody(locationSchema, payload);
  if (validated instanceof Response) {
    return validated;
  }

  await requireRole(supabase, session.user.id, tenantSlug, ['admin']);

  const locationPayload = {
    tenant_slug: validated.data.tenant_slug ?? tenantSlug,
    name: validated.data.name,
    address: validated.data.address ?? null,
    phone: validated.data.phone ?? null,
    email: validated.data.email ?? null,
    timezone: validated.data.timezone ?? 'UTC',
    operating_hours: validated.data.operating_hours ?? null,
    is_active: validated.data.is_active ?? true,
  };

  const { data, error } = await supabase
    .from('locations')
    .insert(locationPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    logError('Failed to create location', { error: error?.message, tenantSlug });
    return apiResponse(null, error?.message ?? 'Could not create location', {}, 500);
  }

  const createdLocation = data as { id: string; name: string };

  await supabase.from('audit_logs').insert({
    tenant_slug: tenantSlug,
    user_id: session.user.id,
    action: 'create_location',
    details: { location_id: createdLocation.id, name: createdLocation.name },
  } as never);

  logInfo('Location created', { locationId: createdLocation.id, tenantSlug });
  return apiResponse(data, null, {}, 201);
}
