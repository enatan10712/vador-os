import type { OrderRow, InventoryRow } from './api';

function toDateKey(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function aggregateDailyOrders(orders: OrderRow[]) {
  return orders.reduce<Record<string, { revenue: number; orderCount: number; uniqueCustomers: Set<string> }>>((acc, order) => {
    const key = toDateKey(order.created_at);
    const existing = acc[key] ?? { revenue: 0, orderCount: 0, uniqueCustomers: new Set<string>() };
    existing.revenue += order.total_amount;
    existing.orderCount += 1;
    if (order.customer_id) existing.uniqueCustomers.add(order.customer_id);
    acc[key] = existing;
    return acc;
  }, {});
}

export function buildSeriesFromOrders(orders: OrderRow[]) {
  const buckets = aggregateDailyOrders(orders);
  const sortedKeys = Object.keys(buckets).sort();
  const series = sortedKeys.map((day) => ({
    day,
    revenue: buckets[day].revenue,
    orders: buckets[day].orderCount,
    customers: buckets[day].uniqueCustomers.size,
  }));
  return series;
}

export function movingAverage(values: number[], window = 3) {
  if (!values.length) return [];
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

export function simpleTrend(values: number[]) {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  const numerator = values.reduce((sum, value, idx) => sum + (idx - xMean) * (value - yMean), 0);
  const denominator = values.reduce((sum, idx) => sum + Math.pow(idx - xMean, 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function topSellingProducts(orders: OrderRow[], limit = 6) {
  const tally = orders.flatMap((order) => order.order_items).reduce<Record<string, { quantity: number; revenue: number }>>((acc, item) => {
    const key = item.name;
    acc[key] = acc[key] ?? { quantity: 0, revenue: 0 };
    acc[key].quantity += item.quantity;
    acc[key].revenue += item.quantity * item.price;
    return acc;
  }, {});

  return Object.entries(tally)
    .map(([name, metrics]) => ({ name, ...metrics }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function inventoryRiskItems(items: InventoryRow[]) {
  return items
    .map((item) => ({
      ...item,
      riskScore: item.status === 'out_of_stock' ? 100 : item.status === 'low_stock' ? 70 : 20,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}
