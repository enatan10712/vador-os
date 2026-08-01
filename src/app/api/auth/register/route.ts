import { forwardToDjango } from '../../../../lib/djangoProxy';

export async function POST(request: Request) {
  return forwardToDjango(request, '/api/auth/register/', 'POST');
}
