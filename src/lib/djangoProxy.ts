import { NextResponse } from 'next/server';

const DJANGO_BACKEND_URL = process.env.DJANGO_BACKEND_URL ?? 'http://127.0.0.1:8000';

export async function forwardToDjango(request: Request, path: string, method: string = 'GET') {
  const tenantSlug = request.headers.get('x-tenant-slug') || 'robusta-coffee';

  const djangoUrl = `${DJANGO_BACKEND_URL}${path}`;

  let body: string | undefined = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // ignore
    }
  }

  const headers: Record<string, string> = {
    'X-Tenant-Slug': tenantSlug,
    'Cookie': request.headers.get('cookie') || '',
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(djangoUrl, {
      method,
      headers,
      body,
    });

    const data = await res.json();

    // Create Response
    const response = NextResponse.json(data, { status: res.status });

    // Copy set-cookie headers back to client
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
