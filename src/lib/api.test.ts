/**
 * Unit tests for parsePaginationParams and validateBody
 * Requirements: 18.2, 18.3, 18.4, 18.5
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parsePaginationParams, validateBody } from './api';

// ---------------------------------------------------------------------------
// parsePaginationParams
// ---------------------------------------------------------------------------

describe('parsePaginationParams', () => {
  const url = (query: string) => new URL(`https://example.com/api/list${query}`);

  it('returns defaults when no params are provided', () => {
    const result = parsePaginationParams(url(''));
    expect(result).toEqual({
      page: 1,
      pageSize: 20,
      from: 0,
      to: 19,
      sortBy: 'created_at',
      sortDir: 'desc',
    });
  });

  it('parses explicit page and pageSize', () => {
    const result = parsePaginationParams(url('?page=3&pageSize=10'));
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.from).toBe(20);
    expect(result.to).toBe(29);
  });

  it('caps pageSize at 100', () => {
    const result = parsePaginationParams(url('?pageSize=999'));
    expect(result.pageSize).toBe(100);
    expect(result.to).toBe(99); // page 1, pageSize 100: from=0, to=99
  });

  it('computes correct from/to offsets', () => {
    const result = parsePaginationParams(url('?page=2&pageSize=25'));
    expect(result.from).toBe(25);   // (2-1) * 25
    expect(result.to).toBe(49);    // 2*25 - 1
  });

  it('defaults page to 1 for invalid values', () => {
    const result = parsePaginationParams(url('?page=abc'));
    expect(result.page).toBe(1);
  });

  it('defaults pageSize to 20 for invalid values', () => {
    const result = parsePaginationParams(url('?pageSize=abc'));
    expect(result.pageSize).toBe(20);
  });

  it('defaults page to 1 for page < 1', () => {
    const result = parsePaginationParams(url('?page=0'));
    expect(result.page).toBe(1);
  });

  it('uses custom sortBy', () => {
    const result = parsePaginationParams(url('?sortBy=updated_at'));
    expect(result.sortBy).toBe('updated_at');
  });

  it('defaults sortBy to created_at', () => {
    const result = parsePaginationParams(url(''));
    expect(result.sortBy).toBe('created_at');
  });

  it('parses sortDir=asc correctly', () => {
    const result = parsePaginationParams(url('?sortDir=asc'));
    expect(result.sortDir).toBe('asc');
  });

  it('defaults sortDir to desc when not provided', () => {
    const result = parsePaginationParams(url(''));
    expect(result.sortDir).toBe('desc');
  });

  it('defaults sortDir to desc for any non-asc value', () => {
    const result = parsePaginationParams(url('?sortDir=invalid'));
    expect(result.sortDir).toBe('desc');
  });

  it('from is always (page-1) * pageSize', () => {
    for (const [page, pageSize] of [[1, 20], [2, 10], [5, 50]]) {
      const result = parsePaginationParams(url(`?page=${page}&pageSize=${pageSize}`));
      expect(result.from).toBe((page - 1) * pageSize);
    }
  });

  it('to is always from + pageSize - 1', () => {
    const result = parsePaginationParams(url('?page=4&pageSize=15'));
    expect(result.to).toBe(result.from + 15 - 1);
  });
});

// ---------------------------------------------------------------------------
// validateBody
// ---------------------------------------------------------------------------

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

describe('validateBody', () => {
  it('returns { data } on valid input', () => {
    const result = validateBody(testSchema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ data: { name: 'Alice', age: 30 } });
  });

  it('returns a Response on invalid input', () => {
    const result = validateBody(testSchema, { name: '', age: -1 });
    expect(result).toBeInstanceOf(Response);
  });

  it('returns a 422 Response on invalid input', async () => {
    const result = validateBody(testSchema, { name: '', age: -1 });
    expect((result as Response).status).toBe(422);
  });

  it('response body contains meta.fields array on failure', async () => {
    const result = validateBody(testSchema, {}) as Response;
    const body = await result.json();
    expect(body.error).toBe('Validation failed');
    expect(body.data).toBeNull();
    expect(Array.isArray(body.meta.fields)).toBe(true);
    expect(body.meta.fields.length).toBeGreaterThan(0);
  });

  it('each field error has field and message properties', async () => {
    const result = validateBody(testSchema, { name: '', age: 'not-a-number' }) as Response;
    const body = await result.json();
    for (const err of body.meta.fields) {
      expect(typeof err.field).toBe('string');
      expect(typeof err.message).toBe('string');
    }
  });

  it('reports correct field path on nested error', async () => {
    const nested = z.object({ user: z.object({ email: z.string().email() }) });
    const result = validateBody(nested, { user: { email: 'bad' } }) as Response;
    const body = await result.json();
    const fieldNames = body.meta.fields.map((f: { field: string }) => f.field);
    expect(fieldNames).toContain('user.email');
  });

  it('uses "root" for top-level errors without a path', async () => {
    const rootSchema = z.string().min(1);
    const result = validateBody(rootSchema, '') as Response;
    const body = await result.json();
    const fieldNames = body.meta.fields.map((f: { field: string }) => f.field);
    expect(fieldNames).toContain('root');
  });

  it('success result is not a Response instance', () => {
    const result = validateBody(testSchema, { name: 'Bob', age: 25 });
    expect(result).not.toBeInstanceOf(Response);
  });
});
