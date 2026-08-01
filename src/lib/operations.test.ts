import { describe, expect, it } from 'vitest';
import { summarizeInventoryStatus, getStatusTone } from './operations';

describe('summarizeInventoryStatus', () => {
  it('groups inventory by critical, warning, and healthy states', () => {
    const summary = summarizeInventoryStatus([
      { status: 'critical' },
      { status: 'low_stock' },
      { status: 'low_stock' },
      { status: 'in_stock' },
    ]);

    expect(summary).toEqual({
      critical: 1,
      warning: 2,
      healthy: 1,
      total: 4,
    });
  });

  it('returns zeroed values for empty input', () => {
    expect(summarizeInventoryStatus([])).toEqual({
      critical: 0,
      warning: 0,
      healthy: 0,
      total: 0,
    });
  });
});

describe('getStatusTone', () => {
  it('returns the expected classes for supported statuses', () => {
    expect(getStatusTone('critical')).toContain('destructive');
    expect(getStatusTone('low_stock')).toContain('warning');
    expect(getStatusTone('in_stock')).toContain('success');
  });
});
