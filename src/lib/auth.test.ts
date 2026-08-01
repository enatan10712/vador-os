import { describe, expect, it } from 'vitest';
import { resolvePostLoginRoute } from './auth-utils';

describe('resolvePostLoginRoute', () => {
  it('routes managers to the dashboard', () => {
    expect(resolvePostLoginRoute({ app_metadata: { role: 'manager' } })).toBe('/dashboard');
  });

  it('routes cashiers to the POS workspace', () => {
    expect(resolvePostLoginRoute({ user_metadata: { role: 'cashier' } })).toBe('/pos');
  });

  it('routes kitchen staff to the kitchen board', () => {
    expect(resolvePostLoginRoute({ app_metadata: { role: 'kitchen' } })).toBe('/kitchen');
  });

  it('falls back to the dashboard for unknown roles', () => {
    expect(resolvePostLoginRoute({ user_metadata: { role: 'unknown' } })).toBe('/dashboard');
  });
});
