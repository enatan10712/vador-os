import { forwardToDjango } from '../../../../lib/djangoProxy';

export async function GET(request: Request) {
  return forwardToDjango(request, '/api/auth/session/', 'GET');
}
