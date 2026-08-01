import { NextResponse } from 'next/server';
import { requireAuth, resolveTenantSlugFromHost } from '../../../lib/auth';
import { logError } from '../../../lib/logger';
import { requireRole } from '../../../lib/access';

export async function GET(request: Request) {
  const { supabase, session } = await requireAuth();
  const tenantSlug = resolveTenantSlugFromHost(request.headers.get('host') ?? undefined);
  await requireRole(supabase, session.user.id, tenantSlug, ['admin', 'manager']);

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    logError('Failed to fetch audit logs', { error: error.message, tenantSlug });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
