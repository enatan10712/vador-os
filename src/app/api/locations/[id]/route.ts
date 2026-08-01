import type { NextRequest } from 'next/server';
import { validateBody } from '../../../../lib/api';
import { requireAuth, resolveTenantSlugFromRequest } from '../../../../lib/auth';
import { logError, logInfo } from '../../../../lib/logger';
import { apiResponse } from '../../../../lib/response';
import { locationUpdateSchema } from '../../../../lib/validators';
import { requireRole } from '../../../../lib/access';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromRequest(request);
  const { id } = await context.params;

  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager', 'cashier', 'kitchen', 'waiter']);

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    logError('Failed to fetch location', { error: error.message, locationId: id, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  if (!data) {
    return apiResponse(null, 'Location not found', {}, 404);
  }

  return apiResponse(data, null, {});
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromRequest(request);
  const { id } = await context.params;
  const payload = await request.json();
  const validated = validateBody(locationUpdateSchema, payload);
  if (validated instanceof Response) {
    return validated;
  }

  await requireRole(supabase, session.user.id, tenantSlug, ['admin']);

  const updatePayload = {
    name: validated.data.name,
    address: validated.data.address,
    phone: validated.data.phone,
    email: validated.data.email,
    timezone: validated.data.timezone,
    operating_hours: validated.data.operating_hours,
    is_active: validated.data.is_active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('locations')
    .update(updatePayload as never)
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  if (error) {
    logError('Failed to update location', { error: error.message, locationId: id, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  if (!data) {
    return apiResponse(null, 'Location not found', {}, 404);
  }

  const updatedLocation = data as { id: string; name: string };

  await supabase.from('audit_logs').insert({
    tenant_slug: tenantSlug,
    user_id: session.user.id,
    action: 'update_location',
    details: { location_id: updatedLocation.id, name: updatedLocation.name },
  } as never);

  logInfo('Location updated', { locationId: updatedLocation.id, tenantSlug });
  return apiResponse(data, null, {});
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromRequest(request);
  const { id } = await context.params;

  await requireRole(supabase, session.user.id, tenantSlug, ['admin']);

  const { data, error } = await supabase
    .from('locations')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .eq('tenant_slug', tenantSlug)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  if (error) {
    logError('Failed to delete location', { error: error.message, locationId: id, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  if (!data) {
    return apiResponse(null, 'Location not found', {}, 404);
  }

  const deletedLocation = data as { id: string; name: string };

  await supabase.from('audit_logs').insert({
    tenant_slug: tenantSlug,
    user_id: session.user.id,
    action: 'delete_location',
    details: { location_id: deletedLocation.id, name: deletedLocation.name },
  } as never);

  return apiResponse({ deleted: true }, null, {});
}
