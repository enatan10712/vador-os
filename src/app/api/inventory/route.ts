import { forwardToDjango } from '../../../lib/djangoProxy';

export async function GET(request: Request) {
  return forwardToDjango(request, '/api/inventory/', 'GET');
}

export async function PATCH(request: Request) {
  return forwardToDjango(request, '/api/inventory/', 'PATCH');
}
