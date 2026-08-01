import { forwardToDjango } from '../../../lib/djangoProxy';

export async function GET(request: Request) {
  return forwardToDjango(request, '/api/locations/', 'GET');
}

export async function POST(request: Request) {
  return forwardToDjango(request, '/api/locations/', 'POST');
}
