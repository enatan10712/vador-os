import { forwardToDjango } from '../../../lib/djangoProxy';

export async function GET(request: Request) {
  return forwardToDjango(request, '/api/waste/', 'GET');
}

export async function POST(request: Request) {
  return forwardToDjango(request, '/api/waste/', 'POST');
}
