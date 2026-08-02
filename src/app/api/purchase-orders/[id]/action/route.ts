import { forwardToDjango } from '../../../../../lib/djangoProxy';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToDjango(request, `/api/purchase-orders/${id}/action/`, 'POST');
}
