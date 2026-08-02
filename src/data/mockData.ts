export interface MetricOverview {
  revenue: { value: number; change: string; trend: 'up' | 'down' };
  orders: { value: number; change: string; trend: 'up' | 'down' };
  customers: { value: number; change: string; trend: 'up' | 'down' };
  profit: { value: number; change: string; trend: 'up' | 'down' };
  averageOrder: { value: number; change: string; trend: 'up' | 'down' };
}

export interface ChartDataPoint {
  name: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface ProductPerformance {
  name: string;
  sales: number;
  stock: number;
  category: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  revenue: number;
}

export interface RecentOrder {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: 'Completed' | 'Preparing' | 'Pending' | 'Refunded';
  time: string;
  tier: 'VIP' | 'Regular' | 'New';
}

// Normalized values in Ethiopian Birr (ETB)
export const mockMetrics: MetricOverview = {
  revenue: {
    value: 142850.40,
    change: '+14.2%',
    trend: 'up'
  },
  orders: {
    value: 8420,
    change: '+18.5%',
    trend: 'up'
  },
  customers: {
    value: 3842,
    change: '+12.1%',
    trend: 'up'
  },
  profit: {
    value: 48569.12,
    change: '+15.8%',
    trend: 'up'
  },
  averageOrder: {
    value: 285.50, // Average ETB price for premium beverage + pastry combinations
    change: '-2.4%',
    trend: 'down'
  }
};

export const mockMonthlyPerformance: ChartDataPoint[] = [
  { name: 'Jan', revenue: 94000, orders: 5500, profit: 32000 },
  { name: 'Feb', revenue: 102000, orders: 6000, profit: 35000 },
  { name: 'Mar', revenue: 115000, orders: 6800, profit: 39000 },
  { name: 'Apr', revenue: 108000, orders: 6400, profit: 37000 },
  { name: 'May', revenue: 125000, orders: 7400, profit: 42000 },
  { name: 'Jun', revenue: 138000, orders: 8100, profit: 47000 },
  { name: 'Jul', revenue: 142850, orders: 8420, profit: 48569 },
];

export const mockDailyPerformance = [
  { name: '07:00 AM', revenue: 3200, orders: 190 },
  { name: '09:00 AM', revenue: 8400, orders: 520 },
  { name: '11:00 AM', revenue: 6800, orders: 410 },
  { name: '01:00 PM', revenue: 5900, orders: 360 },
  { name: '03:00 PM', revenue: 7200, orders: 440 },
  { name: '05:00 PM', revenue: 4900, orders: 300 },
  { name: '07:00 PM', revenue: 3500, orders: 220 },
];

// Rich, authentic Ethiopian specialty coffees & locally sourced pastries
export const popularProducts: ProductPerformance[] = [
  { name: 'Sidama Single-Origin Espresso', sales: 1420, stock: 120, category: 'Beverages', status: 'In Stock', revenue: 113600 },
  { name: 'Yirgacheffe Pour-Over (Ceremony style)', sales: 1280, stock: 85, category: 'Beverages', status: 'In Stock', revenue: 96000 },
  { name: 'Spiced Teff Cruffin', sales: 940, stock: 12, category: 'Bakery', status: 'Low Stock', revenue: 61100 },
  { name: 'Harar Dark Roast Flat White', sales: 860, stock: 240, category: 'Beverages', status: 'In Stock', revenue: 51600 },
  { name: 'Avocado Teff Sourdough Tartine', sales: 620, stock: 8, category: 'Food', status: 'Low Stock', revenue: 74400 },
  { name: 'Shakisso Honey Macchiato', sales: 510, stock: 350, category: 'Beverages', status: 'In Stock', revenue: 25500 },
  { name: 'Traditional Gesha Nitro Cold Brew', sales: 480, stock: 0, category: 'Bakery', status: 'Out of Stock', revenue: 33600 }
];

export const recentOrders: RecentOrder[] = [
  { id: '1042', customer: 'Abebe Bikila', items: '2x Harar Flat White, 1x Spiced Teff Cruffin', total: 450, status: 'Preparing', time: '2m ago', tier: 'VIP' },
  { id: '1041', customer: 'Sifan Hassan', items: '1x Yirgacheffe Pour-Over, 1x Avocado Tartine', total: 380, status: 'Completed', time: '8m ago', tier: 'Regular' },
  { id: '1040', customer: 'Lelisa Desisa', items: '1x Gesha Nitro, 1x Spiced Teff Cruffin', total: 310, status: 'Completed', time: '14m ago', tier: 'VIP' },
  { id: '1039', customer: 'Tsige Duguma', items: '4x Flat White (Ceremonial Pitcher)', total: 1200, status: 'Completed', time: '35m ago', tier: 'New' },
  { id: '1038', customer: 'Kenenisa Bekele', items: '1x Sidama Single-Origin Espresso', total: 110, status: 'Refunded', time: '1h ago', tier: 'Regular' },
];

export interface InventoryAlert {
  id: string;
  item: string;
  current: string;
  required: string;
  unit: string;
  status: 'critical' | 'warning';
}

export const inventoryAlerts: InventoryAlert[] = [
  { id: 'ia1', item: 'Single Origin Ethiopia Yirgacheffe Beans', current: '4.2', required: '10.0', unit: 'kg', status: 'critical' },
  { id: 'ia2', item: 'Oat Milk (Barista Edition)', current: '15', required: '50', unit: 'Liters', status: 'warning' },
  { id: 'ia3', item: 'Organic Honey & Spiced Sauces', current: '1.2', required: '5.0', unit: 'kg', status: 'critical' },
  { id: 'ia4', item: 'Vendor Recyclable Hot Cups (12oz)', current: '450', required: '2000', unit: 'Units', status: 'warning' },
];

export const aiInsights = [
  {
    id: 'ai1',
    title: 'Ethiopian Ceremony Staffing Optimization',
    description: 'Traditional pouring rushes detected around mid-morning. Elevating barista staffing on shift 09:00 AM - 12:00 PM increases customer loyalty retention by +15%.',
    impact: '+15.2% Throughput',
    confidence: '96%'
  },
  {
    id: 'ai2',
    title: 'Spiced Teff Butter Croissants Strategy',
    description: 'Baking limits are outstripped by local demand. Vendor AI auto-adjusted baking schedules to prioritize morning batches of Teff pastries.',
    impact: '+8,500 ብር weekly profit',
    confidence: '92%'
  },
  {
    id: 'ai3',
    title: 'Sidama/Yirgacheffe Roasting Automation',
    description: 'Fresh bean stock suggests full depletion in 48 hours. Vendor AI prepared a draft CBE Birr payment purchase order with Sidama farming partners.',
    impact: 'Avoid Out-of-Stock cost',
    confidence: '99%'
  }
];
