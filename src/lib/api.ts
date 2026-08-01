import { z } from 'zod';
import type { Database } from './database.types';
import { apiResponse } from './response';

export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'] & {
  order_items: OrderItemRow[];
};
export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const response = await fetch(url, {
    cache: 'no-cache',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { 'X-Requested-With': 'XMLHttpRequest' }),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export const fetchOrders = () => fetchJson<OrderRow[]>('/api/orders');
export const fetchInventory = () => fetchJson<InventoryRow[]>('/api/inventory');
export const fetchNotifications = () => fetchJson<NotificationRow[]>('/api/notifications');

export type CreateOrderPayload = {
  tenant_slug?: string;
  customer_id?: string | null;
  table_number: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    metadata?: Record<string, unknown> | null;
  }[];
  notes?: string | null;
};

export const createOrder = (payload: CreateOrderPayload) =>
  fetchJson<{ order: OrderRow; items: unknown[] }>('/api/orders', {
    method: 'POST',
    body: payload,
  });

export const updateInventoryItem = (payload: { item_id: string; quantity_delta: number }) =>
  fetchJson<InventoryRow>('/api/inventory', {
    method: 'PATCH',
    body: payload,
  });

// ---------------------------------------------------------------------------
// Pagination helpers (Requirement 18.3, 18.4, 18.5)
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** 1-based page number (defaults to 1) */
  page: number;
  /** Number of items per page (defaults to 20, max 100) */
  pageSize: number;
  /** Inclusive start offset for Supabase .range(from, to) */
  from: number;
  /** Inclusive end offset for Supabase .range(from, to) */
  to: number;
  /** Column name to sort by (defaults to 'created_at') */
  sortBy: string;
  /** Sort direction — 'asc' or 'desc' (defaults to 'desc') */
  sortDir: 'asc' | 'desc';
}

/**
 * Extracts and normalises pagination / sorting parameters from a URL.
 *
 * Supported query params:
 *   - `page`     — 1-based page number (default 1)
 *   - `pageSize` — items per page (default 20, capped at 100)
 *   - `sortBy`   — column name to sort on (default 'created_at')
 *   - `sortDir`  — "asc" | "desc" (default "desc")
 *
 * @param url  The request URL (e.g. from `new URL(request.url)`)
 * @returns    Normalised pagination params including `from`/`to` offsets
 *             suitable for Supabase `.range(from, to)`.
 */
export function parsePaginationParams(url: URL): PaginationParams {
  const MAX_PAGE_SIZE = 100;
  const DEFAULT_PAGE_SIZE = 20;

  const rawPage = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPageSize = parseInt(
    url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const sortBy = url.searchParams.get('sortBy') ?? 'created_at';

  const rawSortDir = url.searchParams.get('sortDir')?.toLowerCase();
  const sortDir: 'asc' | 'desc' = rawSortDir === 'asc' ? 'asc' : 'desc';

  return { page, pageSize, from, to, sortBy, sortDir };
}

// ---------------------------------------------------------------------------
// Zod validation helper (Requirement 18.2)
// ---------------------------------------------------------------------------

export type ValidationFieldError = {
  field: string;
  message: string;
};

export type ValidateBodySuccess<T> = { data: T };
export type ValidateBodyResult<T> = ValidateBodySuccess<T> | Response;

/**
 * Validates an unknown request body against a Zod schema.
 *
 * On success returns `{ data: T }`.
 * On failure returns a `422 Unprocessable Entity` Response with the envelope:
 *   `{ data: null, error: "Validation failed", meta: { fields: [...] } }`
 * where `fields` is an array of `{ field, message }` objects.
 *
 * @param schema  A Zod schema describing the expected shape.
 * @param body    The raw (unknown) request body.
 *
 * @example
 * ```ts
 * const result = validateBody(createOrderSchema, await req.json());
 * if (result instanceof Response) return result; // 422
 * const { data } = result; // typed and validated
 * ```
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): ValidateBodyResult<T> {
  const parsed = schema.safeParse(body);

  if (parsed.success) {
    return { data: parsed.data };
  }

  const fields: ValidationFieldError[] = parsed.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

  return apiResponse(null, 'Validation failed', { fields }, 422);
}
