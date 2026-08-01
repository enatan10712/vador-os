import type { Database } from '../../../lib/database.types';
import { requireAuth, resolveTenantSlugFromHost, createServerSupabase } from '../../../lib/auth';

type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];
type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update'];
import { logError, logInfo } from '../../../lib/logger';
import { inventoryUpdateSchema } from '../../../lib/validators';
import { requireRole } from '../../../lib/access';
import { apiResponse } from '../../../lib/response';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenant_slug') ?? request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('updated_at', { ascending: false });

  if (error) {
    logError('Failed to fetch inventory', { error: error.message, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  return apiResponse(data ?? [], null, { total: data?.length ?? 0 });
}

export async function PATCH(request: Request) {
  const { supabase, session } = await requireAuth();

  const parsed = inventoryUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiResponse(null, 'Validation failed', { fields: parsed.error.flatten().fieldErrors }, 422);
  }

  const tenantSlug = request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager', 'cashier']);

  const { item_id, quantity_delta } = parsed.data;

  const { data: existing, error: findError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', item_id)
    .eq('tenant_slug', tenantSlug)
    .maybeSingle<InventoryItemRow>();

  if (findError || !existing) {
    logError('Inventory item not found', { error: findError?.message, item_id });
    return apiResponse(null, 'Inventory item not found', {}, 404);
  }

  const nextQuantity = Math.max(0, existing.quantity + quantity_delta);
  const nextStatus = nextQuantity <= 0 ? 'out_of_stock' : nextQuantity <= existing.threshold ? 'low_stock' : 'in_stock';

  const updatePayload: InventoryItemUpdate = {
    quantity: nextQuantity,
    status: nextStatus,
  };

  const { data: updateData, error: updateError } = await supabase
    .from('inventory_items')
    .update(updatePayload as never)
    .eq('id', item_id)
    .select('*')
    .single();

  if (updateError) {
    logError('Inventory update failed', { error: updateError.message, item_id });
    return apiResponse(null, updateError.message, {}, 500);
  }

  await supabase.from('audit_logs').insert({
    tenant_slug: tenantSlug,
    user_id: session.user.id,
    action: 'update_inventory',
    details: { item_id, quantity_delta, nextQuantity }
  } as never);

  if (nextStatus !== existing.status) {
    await supabase.from('notifications').insert({
      tenant_slug: tenantSlug,
      title: nextStatus === 'out_of_stock' ? 'Inventory depleted' : 'Inventory threshold reached',
      description: `Item ${existing.name} now has ${nextQuantity} ${existing.unit} remaining.`,
      type: nextStatus === 'out_of_stock' ? 'alert' : 'system'
    } as never);
  }

  logInfo('Inventory updated', { item_id, nextQuantity, tenantSlug });
  return apiResponse(updateData, null, {});
}
