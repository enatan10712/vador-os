export type InventoryHealthStatus = 'critical' | 'low_stock' | 'in_stock' | 'out_of_stock';

export interface InventorySummary {
  critical: number;
  warning: number;
  healthy: number;
  total: number;
}

export function summarizeInventoryStatus(items: Array<{ status?: string | null }> | undefined): InventorySummary {
  const summary = { critical: 0, warning: 0, healthy: 0, total: 0 };

  for (const item of items ?? []) {
    const status = item.status ?? 'in_stock';
    summary.total += 1;

    if (status === 'out_of_stock' || status === 'critical') {
      summary.critical += 1;
    } else if (status === 'low_stock') {
      summary.warning += 1;
    } else {
      summary.healthy += 1;
    }
  }

  return summary;
}

export function getStatusTone(status: string | null | undefined): string {
  switch (status) {
    case 'out_of_stock':
    case 'critical':
      return 'text-destructive bg-destructive/10';
    case 'low_stock':
      return 'text-warning bg-warning/10';
    default:
      return 'text-success bg-success/10';
  }
}
