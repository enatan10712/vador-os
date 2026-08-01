import { forwardToDjango } from '../../../../lib/djangoProxy';

export async function GET(request: Request) {
  return forwardToDjango(request, '/api/locations/', 'GET');
}

export async function PATCH(request: Request) {
  return forwardToDjango(request, '/api/locations/', 'PATCH');
}

export async function DELETE(request: Request) {
  return forwardToDjango(request, '/api/locations/', 'DELETE');
}
