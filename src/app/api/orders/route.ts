import { requireAuth, resolveTenantSlugFromHost, createServerSupabase } from '../../../lib/auth';
import { logInfo, logError } from '../../../lib/logger';
import { createOrderSchema } from '../../../lib/validators';
import { requireRole } from '../../../lib/access';
import { apiResponse } from '../../../lib/response';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenant_slug') ?? request.headers.get('x-tenant-slug') ?? resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false });

  if (error) {
    logError('Failed to fetch orders', { error: error.message, tenantSlug });
    return apiResponse(null, error.message, {}, 500);
  }

  return apiResponse(data ?? [], null, { total: data?.length ?? 0 });
}

export async function POST(request: Request) {
  const tenantSlugFromHost = resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  const { supabase, session } = await requireAuth();

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse(null, 'Validation failed', { fields: parsed.error.flatten().fieldErrors }, 422);
  }

  const tenantSlug = parsed.data.tenant_slug ?? tenantSlugFromHost;
  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager', 'cashier', 'waiter']);

  const orderPayload = {
    tenant_slug: tenantSlug,
    customer_id: parsed.data.customer_id ?? null,
    table_number: parsed.data.table_number,
    total_amount: parsed.data.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    status: 'pending' as const,
    notes: parsed.data.notes ?? null,
    created_by: session?.user.id ?? null
  };

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload as never)
    .select('*')
    .single();

  if (orderError || !orderData) {
    logError('Order creation failed', { error: orderError?.message, orderPayload, tenantSlug });
    return apiResponse(null, orderError?.message ?? 'Order creation failed', {}, 500);
  }

  const createdOrder = orderData as { id: string; [key: string]: unknown };

  const itemsPayload = parsed.data.items.map((item) => ({
    order_id: createdOrder.id,
    product_id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    metadata: item.metadata ?? null
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload as never);
  if (itemsError) {
    logError('Order items creation failed', { error: itemsError.message, orderId: createdOrder.id });
    return apiResponse(null, itemsError.message, {}, 500);
  }

  await supabase.from('audit_logs').insert({
    tenant_slug: tenantSlug,
    user_id: session.user.id,
    action: 'create_order',
    details: { order_id: createdOrder.id, total_amount: orderPayload.total_amount }
  } as never);

  await supabase.from('notifications').insert({
    tenant_slug: tenantSlug,
    title: 'New order received',
    description: `Order ${createdOrder.id} was placed by ${orderPayload.table_number}.`,
    type: 'order'
  } as never);

  logInfo('Order created successfully', { orderId: createdOrder.id, tenantSlug });
  return apiResponse({ order: createdOrder, items: itemsPayload }, null, {}, 201);
}
