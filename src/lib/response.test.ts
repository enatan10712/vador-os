/**
 * Unit tests for src/lib/response.ts
 * Validates: Requirements 18.1 — consistent { data, error, meta } envelope
 */

import { describe, it, expect } from 'vitest';
import { apiResponse, apiError } from './response';
import type { ApiEnvelope, ApiMeta } from './response';

// Helper: parse a Response into its JSON body
async function parseBody<T>(res: Response): Promise<ApiEnvelope<T>> {
  return res.json() as Promise<ApiEnvelope<T>>;
}

describe('apiResponse', () => {
  it('wraps data in the { data, error, meta } envelope', async () => {
    const res = apiResponse({ id: 1, name: 'Test' });
    const body = await parseBody<{ id: number; name: string }>(res);

    expect(body.data).toEqual({ id: 1, name: 'Test' });
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
  });

  it('defaults to HTTP 200', () => {
    const res = apiResponse('ok');
    expect(res.status).toBe(200);
  });

  it('uses the provided HTTP status code', () => {
    const res = apiResponse(null, null, {}, 201);
    expect(res.status).toBe(201);
  });

  it('includes meta pagination fields when provided', async () => {
    const meta: ApiMeta = { total: 42, page: 2, pageSize: 10 };
    const res = apiResponse([1, 2, 3], null, meta);
    const body = await parseBody<number[]>(res);

    expect(body.meta).toEqual({ total: 42, page: 2, pageSize: 10 });
  });

  it('includes arbitrary extension keys in meta', async () => {
    const meta: ApiMeta = { total: 5, cursor: 'abc123' };
    const res = apiResponse([], null, meta);
    const body = await parseBody<[]>(res);

    expect(body.meta.cursor).toBe('abc123');
  });

  it('can carry an error message alongside a null data payload', async () => {
    const res = apiResponse(null, 'Something went wrong', {}, 500);
    const body = await parseBody<null>(res);

    expect(body.data).toBeNull();
    expect(body.error).toBe('Something went wrong');
    expect(res.status).toBe(500);
  });

  it('handles null data with defaults', async () => {
    const res = apiResponse(null);
    const body = await parseBody<null>(res);

    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(res.status).toBe(200);
  });
});

describe('apiError', () => {
  it('returns { data: null, error: message, meta: {} }', async () => {
    const res = apiError('Not found');
    const body = await parseBody<null>(res);

    expect(body.data).toBeNull();
    expect(body.error).toBe('Not found');
    expect(body.meta).toEqual({});
  });

  it('defaults to HTTP 400', () => {
    const res = apiError('Bad request');
    expect(res.status).toBe(400);
  });

  it('uses the provided HTTP status code', () => {
    const res = apiError('Unauthorized', 401);
    expect(res.status).toBe(401);
  });

  it('uses 403 for forbidden errors', () => {
    const res = apiError('Forbidden', 403);
    expect(res.status).toBe(403);
  });

  it('uses 500 for server errors', async () => {
    const res = apiError('Internal server error', 500);
    const body = await parseBody<null>(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(body.data).toBeNull();
    expect(body.meta).toEqual({});
  });

  it('sets the Content-Type header to application/json', () => {
    const res = apiError('Oops');
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
