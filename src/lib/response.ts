/**
 * Shared API response utilities for the { data, error, meta } envelope.
 * All API routes should use these factory functions for consistency.
 * Requirements: 18.1
 */

/**
 * Pagination and extension metadata included in every API response.
 */
export interface ApiMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

/**
 * The standard response envelope shape returned by all API routes.
 */
export interface ApiEnvelope<T> {
  data: T | null;
  error: string | null;
  meta: ApiMeta;
}

/**
 * Wraps a successful (or error) payload in the standard `{ data, error, meta }` envelope
 * and returns a `Response` using `Response.json()`.
 *
 * @param data    - The response payload (null on error responses).
 * @param error   - An error message string, or null on success.
 * @param meta    - Optional pagination / extension metadata.
 * @param status  - HTTP status code (defaults to 200).
 */
export function apiResponse<T>(
  data: T | null,
  error: string | null = null,
  meta: ApiMeta = {},
  status: number = 200,
): Response {
  const body: ApiEnvelope<T> = { data, error, meta };
  return Response.json(body, { status });
}

/**
 * Convenience factory for error responses.
 * Returns the envelope object (not a `Response`) so callers can pass it directly
 * to `apiResponse` or inspect it in tests.
 *
 * @param message - Human-readable error message.
 * @param status  - HTTP status code (defaults to 400).
 */
export function apiError(message: string, status: number = 400): Response {
  const body: ApiEnvelope<null> = { data: null, error: message, meta: {} };
  return Response.json(body, { status });
}
