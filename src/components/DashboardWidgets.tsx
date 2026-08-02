'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';
import {
  mockMetrics,
  recentOrders,
  inventoryAlerts,
  aiInsights
} from '../data/mockData';
import { fetchInventory, fetchOrders, type OrderRow } from '../lib/api';
import { Skeleton } from './ui/Skeleton';
import {
  DollarSign,
  ShoppingBag,
  Users2,
  Percent,
  Scale,
  Sparkles,
  Check,
  Play,
  Clock,
  CloudSun,
  Calendar,
  Plus,
  Send,
  AlertCircle
} from 'lucide-react';

function formatRelativeTime(timestamp: string, locale: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return locale === 'am' ? 'አሁን' : 'Just now';
  if (minutes < 60) return locale === 'am' ? `${minutes} ደቂቃ በፊት` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === 'am' ? `${hours} ሰዓት በፊት` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'am' ? `${days} ቀን በፊት` : `${days}d ago`;
}

function mapOrderToPreview(order: OrderRow, locale: string) {
  return {
    id: order.id,
    customer: order.customer_id ?? (locale === 'am' ? 'ደንበኛ' : 'Guest'),
    items: order.order_items.map((item) => item.name).join(', '),
    total: order.total_amount,
    status:
      order.status === 'completed'
        ? 'Completed'
        : order.status === 'preparing'
        ? 'Preparing'
        : order.status === 'pending'
        ? 'Pending'
        : 'Cancelled',
    time: formatRelativeTime(order.created_at, locale),
  };
}

/* ---------------- Metric Cards Section ---------------- */
export function MetricCards() {
  const { locale, formatCurrency } = useStore();
  const t = translations[locale];

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 20,
    refetchInterval: 3000, // Near-realtime polling every 3 seconds
    retry: 1,
  });

  const ordersList = ordersData
    ? (Array.isArray(ordersData) ? ordersData : (ordersData as any).data || [])
    : [];

  const liveRevenue = ordersList.reduce((acc: any, order: any) => acc + (order.total_amount || order.total || 0), 0);
  const liveOrders = ordersList.length;

  const averageOrderValue = liveOrders && liveRevenue ?liveRevenue / liveOrders : mockMetrics.averageOrder.value;

  const metrics = [
    {
      key: 'revenue',
      label: t.revenue,
      value: formatCurrency(liveRevenue ?? mockMetrics.revenue.value),
      change: mockMetrics.revenue.change,
      trend: mockMetrics.revenue.trend,
      desc: t.vsPreviousMonth,
      icon: DollarSign,
      color: 'text-amber-500 bg-amber-500/10'
    },
    {
      key: 'orders',
      label: t.orders,
      value: (liveOrders ?? mockMetrics.orders.value).toLocaleString(locale === 'am' ? 'am-ET' : 'en-US'),
      change: mockMetrics.orders.change,
      trend: mockMetrics.orders.trend,
      desc: t.vsPreviousMonth,
      icon: ShoppingBag,
      color: 'text-yellow-500 bg-yellow-500/10'
    },
    {
      key: 'avgOrder',
      label: t.averageOrder,
      value: formatCurrency(averageOrderValue),
      change: mockMetrics.averageOrder.change,
      trend: mockMetrics.averageOrder.trend,
      desc: t.vsPreviousMonth,
      icon: Scale,
      color: 'text-orange-500 bg-orange-500/10'
    },
    {
      key: 'customers',
      label: t.customers,
      value: mockMetrics.customers.value.toLocaleString(locale === 'am' ? 'am-ET' : 'en-US'),
      change: mockMetrics.customers.change,
      trend: mockMetrics.customers.trend,
      desc: t.vsPreviousMonth,
      icon: Users2,
      color: 'text-emerald-500 bg-emerald-500/10'
    },
    {
      key: 'profit',
      label: t.profit,
      value: formatCurrency(mockMetrics.profit.value),
      change: mockMetrics.profit.change,
      trend: mockMetrics.profit.trend,
      desc: t.vsPreviousMonth,
      icon: Percent,
      color: 'text-amber-600 bg-amber-600/10'
    }
  ];

  if (ordersLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="glass-panel p-5">
            <Skeleton width="42%" height={12} className="mb-4" />
            <Skeleton width="68%" height={28} className="mb-2" />
            <Skeleton width="56%" height={12} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
      {metrics.map((card, idx) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.08 }}
          className="glass-panel glass-panel-hover p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">{card.label}</span>
            <div className={`p-2 rounded-xl ${card.color}`}>
              <card.icon size={15} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">{card.value}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[11px] font-bold ${card.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                {card.change}
              </span>
              <span className="text-[10px] text-muted-foreground">{card.desc}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- AI Insights Widget ---------------- */
export function AIInsightsWidget() {
  const { addQuickActionLog, locale } = useStore();
  const t = translations[locale];

  const handleApplyInsight = (title: string) => {
    addQuickActionLog(`Vendor AI Auto-Applied Recommendation: ${title}`);
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500 animate-pulse" />
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.aiCopilot}</h4>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">{t.insightsCount}</span>
      </div>

      <div className="space-y-3.5">
        {aiInsights.map((insight) => {
          // If in Amharic, let's translate the dynamic elements or fallback gracefully
          const displayTitle = locale === 'am' ? (
            insight.id === 'ai1' ? 'የኢትዮጵያ ቡና ሥነ-ስርዓት የሰራተኞች ምደባን ማሻሻል' :
            insight.id === 'ai2' ? 'የቅመም ተፍ ክሩፊን እና ክሮይሰንት ስትራቴጂ' :
            'የሲዳማ/ይርጋጨፌ ቆሎ ቡና አውቶሜሽን'
          ) : insight.title;

          const displayDesc = locale === 'am' ? (
            insight.id === 'ai1' ? 'ረፋድ ላይ በባህላዊው አቀራረብ ምክንያት ደንበኞች ይበዛሉ። ከጠዋቱ 03፡00 እስከ 06፡00 ባለው ጊዜ ውስጥ የባሪስታ ሰራተኞችን ቁጥር ማሳደግ የደንበኞችን ታማኝነት በ +15% ይጨምራል።' :
            insight.id === 'ai2' ? 'የተፍ መጋገሪያ ምርቶች ፍላጎት ካለው አቅርቦት በላይ ሆኗል። ቫዶር ኤአይ የጠዋት የተፍ መጋገሪያዎችን ለማስቀደም የመጋገሪያ መርሃ ግብሩን በራሱ አስተካክሏል።' :
            'አዲስ የቡና ፍሬ ክምችት በ48 ሰዓታት ውስጥ ሙሉ በሙሉ እንደሚቀንስ ያሳያል። ቫዶር ኤአይ ከሲዳማ አርሶ አደሮች ጋር በሲቢኢ ብር (CBE Birr) ቀጥታ ክፍያ ግዢ ማዘዣ አዘጋጅቷል።'
          ) : insight.description;

          const displayImpact = locale === 'am' ? (
            insight.id === 'ai1' ? '+15.2% ፈጣን አገልግሎት' :
            insight.id === 'ai2' ? 'በሳምንት +8,500 ብር ተጨማሪ ትርፍ' :
            'ከእቃ መጥፋት ስጋት ነጻ መሆን'
          ) : insight.impact;

          const displayBtn = locale === 'am' ? 'አስተያየቱን ተግብር' : 'Apply Recommendation';

          return (
            <div key={insight.id} className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:border-amber-500/20 transition-all">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-bold text-foreground">{displayTitle}</h5>
                <span className="text-[9px] font-bold text-emerald-500">{insight.confidence} {locale === 'am' ? 'ተስማሚ' : 'match'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                {displayDesc}
              </p>
              <div className="flex items-center justify-between gap-4 mt-3">
                <span className="text-[10px] font-semibold text-amber-500">{displayImpact}</span>
                <button
                  onClick={() => handleApplyInsight(insight.title)}
                  className="text-[10px] bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary px-2.5 py-1 rounded-lg font-bold transition-all"
                >
                  {displayBtn}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Kitchen Queue Widget (KDS) ---------------- */
export function KitchenQueueWidget() {
  const { kitchenQueue, completeKitchenItem, preparingKitchenItem, addKitchenItem, addQuickActionLog, locale } = useStore();
  const t = translations[locale];
  const [newItemText, setNewItemText] = React.useState('');
  const [newItemType, setNewItemType] = React.useState<'Beverage' | 'Food' | 'Pastry'>('Beverage');

  const handleAddCustomOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    addKitchenItem({
      orderNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
      item: newItemText,
      type: newItemType
    });
    addQuickActionLog(`Created kitchen order: ${newItemText}`);
    setNewItemText('');
  };

  const getTranslatedType = (type: string) => {
    if (locale !== 'am') return type;
    switch (type) {
      case 'Beverage': return 'መጠጥ';
      case 'Food': return 'ምግብ';
      case 'Pastry': return 'ኬክ/ፎጣ';
      default: return type;
    }
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.kitchenQueueTitle}</h4>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
          {kitchenQueue.length} {locale === 'am' ? 'ንቁ' : 'Active'}
        </span>
      </div>

      {/* Mini form to inject new coffee-shop queue items */}
      <form onSubmit={handleAddCustomOrder} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder={locale === 'am' ? 'ለምሳሌ፡ 1x ባህላዊ የጅብና ቡና...' : 'e.g., 1x Nitro Brew with foam'}
          className="sm:col-span-1 bg-secondary/50 text-[11px] px-3 py-1.5 rounded-lg focus:outline-none border border-border/60 focus:border-primary"
        />
        <select
          value={newItemType}
          onChange={(e) => setNewItemType(e.target.value as 'Beverage' | 'Food' | 'Pastry')}
          className="bg-secondary/50 text-[11px] px-2 py-1.5 rounded-lg focus:outline-none border border-border/60"
        >
          <option value="Beverage">{locale === 'am' ? 'መጠጥ' : 'Beverage'}</option>
          <option value="Food">{locale === 'am' ? 'ምግብ' : 'Food'}</option>
          <option value="Pastry">{locale === 'am' ? 'ኬክ' : 'Pastry'}</option>
        </select>
        <button
          type="submit"
          className="bg-primary hover:opacity-90 text-primary-foreground text-[10px] font-bold py-1 px-3 rounded-lg flex items-center justify-center gap-1"
        >
          <Plus size={12} /> {locale === 'am' ? 'ጨምር' : 'Add'}
        </button>
      </form>

      <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {kitchenQueue.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3 rounded-xl bg-secondary/40 border border-border/40 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-primary">{item.orderNumber}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.type === 'Beverage' ? 'bg-blue-500/10 text-blue-500' :
                    item.type === 'Food' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-pink-500/10 text-pink-500'
                  }`}>
                    {getTranslatedType(item.type)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {locale === 'am' ? item.timeElapsed.replace('ago', 'በፊት').replace('m', 'ደቂቃ').replace('s', 'ሰከንድ') : item.timeElapsed}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1 truncate">{item.item}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.status === 'pending' ? (
                  <button
                    onClick={() => preparingKitchenItem(item.id)}
                    className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-colors"
                    title={locale === 'am' ? 'ዝግጅት ጀምር' : 'Start Preparing'}
                  >
                    <Play size={12} />
                  </button>
                ) : (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold animate-pulse">
                    {t.preparingAction}
                  </span>
                )}
                <button
                  onClick={() => completeKitchenItem(item.id)}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                  title={locale === 'am' ? 'አጠናቅቅ' : 'Complete & Archive'}
                >
                  <Check size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- Recent Orders List ---------------- */
export function RecentOrdersWidget() {
  const { searchQuery, locale, formatCurrency } = useStore();
  const t = translations[locale];

  const { data: ordersData } = useQuery<OrderRow[]>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 20,
    refetchInterval: 3000, // Near-realtime polling every 3 seconds
    retry: 1,
  });

  const ordersListRecent = ordersData
    ? (Array.isArray(ordersData) ? ordersData : (ordersData as any).data || [])
    : [];

  const recentOrdersSource = ordersListRecent.length > 0
    ? ordersListRecent.slice(0, 4).map((order: any) => mapOrderToPreview(order, locale))
    : recentOrders;

  const filteredOrders = recentOrdersSource.filter((o) =>
    o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.items.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTranslatedStatus = (status: string) => {
    if (locale !== 'am') return status;
    switch (status) {
      case 'Completed': return 'ተጠናቋል';
      case 'Preparing': return 'እየተዘጋጀ ነው';
      case 'Refunded': return 'የተመለሰ';
      case 'Pending': return 'በጥበቃ ላይ';
      default: return status;
    }
  };

  const translateItems = (items: string) => {
    if (locale !== 'am') return items;
    return items
      .replace('Harar Flat White', 'የሐረር ፍላት ዋይት')
      .replace('Spiced Teff Cruffin', 'የቅመም ተፍ ክሩፊን')
      .replace('Yirgacheffe Pour-Over', 'የይርጋጨፌ ፊልተር ቡና')
      .replace('Avocado Tartine', 'አቮካዶ ታርቲን')
      .replace('Gesha Nitro', 'የጌሻ ናይትሮ')
      .replace('Flat White (Ceremonial Pitcher)', 'ፍላት ዋይት (በባህላዊ ማሰሮ)')
      .replace('Sidama Single-Origin Espresso', 'የሲዳማ ሲንግል ኦሪጂን ኤስፕሬሶ')
      .replace('2x', '2 ጊዜ')
      .replace('1x', '1 ጊዜ')
      .replace('4x', '4 ጊዜ');
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.recentOrdersTitle}</h4>
        <span className="text-[10px] text-muted-foreground">{locale === 'am' ? 'ቀጥታ መረጃ' : 'Live Feed'}</span>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {filteredOrders.map((ord) => (
          <div key={ord.id} className="p-3 rounded-xl bg-secondary/30 border border-border/40 hover:bg-secondary/50 transition-all flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">{ord.customer}</span>
                {(ord as { tier?: string }).tier === 'VIP' && (
                  <span className="text-[8px] bg-amber-500/15 text-amber-500 font-extrabold px-1.5 py-0.5 rounded">VIP</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{translateItems(ord.items)}</p>
              <span className="text-[9px] text-muted-foreground/60">
                {locale === 'am' ? ord.time.replace('ago', 'በፊት').replace('m', 'ደቂቃ').replace('h', 'ሰዓት') : ord.time}
              </span>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-foreground">{formatCurrency(ord.total)}</p>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                ord.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                ord.status === 'Preparing' ? 'bg-yellow-500/10 text-yellow-500' :
                ord.status === 'Refunded' ? 'bg-red-500/10 text-red-500' :
                'bg-gray-500/10 text-gray-500'
              }`}>
                {getTranslatedStatus(ord.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Inventory Alerts Widget ---------------- */
export function InventoryAlertsWidget() {
  const { addNotification, addQuickActionLog, locale } = useStore();
  const t = translations[locale];

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    staleTime: 1000 * 20,
    refetchInterval: 3000, // Near-realtime polling every 3 seconds
    retry: 1,
  });

  const inventoryFeed = inventoryData
    ? (Array.isArray(inventoryData) ? inventoryData : (inventoryData as any).data || [])
        .filter((item: any) => item.status !== 'in_stock')
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          item: item.name,
          current: item.quantity,
          required: item.threshold,
          unit: item.unit,
          status: item.status === 'out_of_stock' ? 'critical' : 'low',
        }))
    : inventoryAlerts;

  const handleRestock = (item: string) => {
    addNotification({
      title: locale === 'am' ? 'የክምችት ትዕዛዝ ተቀምጧል' : 'Restock Placed',
      description: locale === 'am' ? `ለ ${item} ረቂቅ የግዢ ማዘዣ ተዘጋጅቷል።` : `Draft purchase order generated for ${item}.`,
      type: 'system'
    });
    addQuickActionLog(`Restock draft created for: ${item}`);
  };

  const translateItemName = (name: string) => {
    if (locale !== 'am') return name;
    return name
      .replace('Single Origin Ethiopia Yirgacheffe Beans', 'የይርጋጨፌ ሲንግል ኦሪጂን የቡና ፍሬዎች')
      .replace('Oat Milk (Barista Edition)', 'የኦት ወተት (ባሪስታ እትም)')
      .replace('Organic Honey & Spiced Sauces', 'ኦርጋኒክ ማር እና የቅመም ሶሶች')
      .replace('Vendor Recyclable Hot Cups (12oz)', 'የቬንዶር ወረቀት ኩባያዎች (12oz)');
  };

  const translateUnitName = (unit: string) => {
    if (locale !== 'am') return unit;
    return unit
      .replace('kg', 'ኪሎ ግራም')
      .replace('Liters', 'ሊትር')
      .replace('Units', 'ፍሬ');
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="text-destructive" />
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.inventoryAlertTitle}</h4>
        </div>
        <span className="text-[10px] text-destructive font-bold">{locale === 'am' ? 'ራስ-ሰር POs' : 'Auto-Linked POs'}</span>
      </div>

      <div className="space-y-3">
        {inventoryFeed.map((alert) => (
          <div key={alert.id} className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{translateItemName(alert.item)}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`text-[10px] font-bold ${alert.status === 'critical' ? 'text-destructive' : 'text-yellow-500'}`}>
                  {alert.current} {translateUnitName(alert.unit)} {locale === 'am' ? 'ቀረው' : 'left'}
                </span>
                <span className="text-[9px] text-muted-foreground">({locale === 'am' ? 'የሚፈለገው' : 'Required'}: {alert.required} {translateUnitName(alert.unit)})</span>
              </div>
            </div>

            <button
              onClick={() => handleRestock(alert.item)}
              className="text-[9px] bg-destructive/10 hover:bg-destructive hover:text-white text-destructive px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0"
            >
              {locale === 'am' ? 'ትዕዛዝ ላክ' : 'Reorder'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Weather Coffee Widget ---------------- */
export function WeatherWidget() {
  const { locale } = useStore();
  const t = translations[locale];

  return (
    <div className="glass-panel p-5 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-900/15 flex flex-col justify-between h-44">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.addisAbabaWeather}</h4>
          <p className="text-[10px] text-muted-foreground">{locale === 'am' ? 'የቦሌ መካከለኛ የሙቀት መጠን' : 'Bole Premium Cafe Area'}</p>
        </div>
        <CloudSun size={24} className="text-amber-500 animate-bounce" />
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-foreground">22&deg;C</span>
          <span className="text-xs text-emerald-500 font-bold">{locale === 'am' ? 'ጠራ ያለ ፀሐያማ ቀን' : 'Mild & Sunny'}</span>
        </div>
        <p className="text-[11px] text-amber-500 font-medium mt-1.5 leading-relaxed">
          {locale === 'am' ? (
            '☀️ ፀሐያማ የአየር ሁኔታ በአዲስ አበባ። የቀዝቃዛ ናይትሮ እና የአይስ ስፓኒሽ ላቴ ሽያጭ በ +18% ከፍ ብሏል።'
          ) : (
            '☀️ Mild and sunny morning in Addis. Iced Spanish Lattes and Nitro Cold Brews demand spiked +18%.'
          )}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Calendar Widget ---------------- */
export function CalendarWidget() {
  const { locale } = useStore();
  const t = translations[locale];

  const events = locale === 'am' ? [
    { time: 'ከጠዋቱ 04:00', label: 'የባሪስታ የጠዋት ቅምሻ እና ስብሰባ' },
    { time: 'ከቀኑ 08:00', label: 'የይርጋጨፌ ቡና ፍሬ አቅርቦት መቀበያ' },
    { time: 'ከምሽቱ 10:30', label: 'የVIP ማረፊያ ቦታ ማስያዝ (8 እንግዶች)' },
  ] : [
    { time: '10:00 AM', label: 'Barista Morning Sync & Tasting' },
    { time: '02:00 PM', label: 'Vendor Restock Arabica beans' },
    { time: '04:30 PM', label: 'VIP Lounge Booking (8 guests)' },
  ];

  return (
    <div className="glass-panel p-5 flex flex-col justify-between h-44">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">{t.calendarWidgetTitle}</h4>
          <p className="text-[10px] text-muted-foreground">{locale === 'am' ? 'የዛሬ መርሃ ግብር' : "Today's Schedule"}</p>
        </div>
        <Calendar size={18} className="text-primary" />
      </div>

      <div className="space-y-1.5">
        {events.map((ev, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="font-extrabold text-primary shrink-0">{ev.time}</span>
            <span className="text-muted-foreground truncate">{ev.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Quick Actions & Audit Logs ---------------- */
export function QuickActionsWidget() {
  const { quickActionsLog, addQuickActionLog, addNotification, locale } = useStore();
  const [customMsg, setCustomMsg] = React.useState('');

  const handleQuickAction = (actionName: string, amActionName?: string) => {
    const activeName = locale === 'am' && amActionName ? amActionName : actionName;
    addQuickActionLog(activeName);
    addNotification({
      title: locale === 'am' ? 'የተመዘገበ ተግባር' : 'Action Logged',
      description: locale === 'am' ? `ተጠቃሚው ፈጣን ተግባርን አስነሳ፡ ${activeName}` : `User triggered quick action: ${activeName}`,
      type: 'system'
    });
  };

  const handleSendCustomLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    addQuickActionLog(locale === 'am' ? `ብጁ መዝገብ፡ ${customMsg}` : `Custom Log: ${customMsg}`);
    setCustomMsg('');
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground">
          {locale === 'am' ? 'የስራ ማስኬጃ መቆጣጠሪያ እና መዝገቦች' : 'Operational Control & Logs'}
        </h4>
        <span className="text-[10px] text-muted-foreground">
          {locale === 'am' ? 'የቀጥታ ስብሰባ ምዝግብ ማስታወሻዎች' : 'Real-time Session Logs'}
        </span>
      </div>

      {/* Button controls */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => handleQuickAction('Manual Restock trigger (Oat Milk)', 'የኦት ወተት በእጅ መሙያ ቁልፍ')}
          className="py-2 px-3 bg-secondary/80 hover:bg-secondary border border-border/80 text-[10px] font-bold text-foreground rounded-lg transition-all"
        >
          🥛 {locale === 'am' ? 'የኦት ወተት ሙሉ' : 'Restock Oat Milk'}
        </button>
        <button
          onClick={() => handleQuickAction('Trigger Daily Backup & Report export', 'ዕለታዊ የሽያጭ ማመሳሰልን አስጀምር')}
          className="py-2 px-3 bg-secondary/80 hover:bg-secondary border border-border/80 text-[10px] font-bold text-foreground rounded-lg transition-all"
        >
          📊 {locale === 'am' ? 'የሽያጭ ማመሳሰል' : 'Trigger Sales Sync'}
        </button>
        <button
          onClick={() => handleQuickAction('Flush KDS completed archive', 'የወጥ ቤት መዝገቦችን አጽዳ')}
          className="py-2 px-3 bg-secondary/80 hover:bg-secondary border border-border/80 text-[10px] font-bold text-foreground rounded-lg transition-all"
        >
          🧹 {locale === 'am' ? 'የKDS መዝገብ አጽዳ' : 'Flush KDS Cache'}
        </button>
        <button
          onClick={() => handleQuickAction('Announce "Happy Hour +10% Off" on App', 'ለደንበኞች የ"Happy Hour +10% ቅናሽ" ማስታወቂያ አስተላልፍ')}
          className="py-2 px-3 bg-secondary/80 hover:bg-secondary border border-border/80 text-[10px] font-bold text-foreground rounded-lg transition-all animate-pulse"
        >
          ☕ {locale === 'am' ? 'ማስታወቂያ አስተላልፍ' : 'Broadcast Promo'}
        </button>
      </div>

      {/* Custom operational log injection form */}
      <form onSubmit={handleSendCustomLog} className="flex gap-2">
        <input
          type="text"
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          placeholder={locale === 'am' ? 'ለስራ ቦታ መጋቢ ብጁ ክስተት መዝግብ...' : 'Log custom event to workspace feed...'}
          className="flex-1 bg-secondary/50 text-[11px] px-3 py-1.5 rounded-lg focus:outline-none border border-border/60 focus:border-primary"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0"
        >
          <Send size={12} />
        </button>
      </form>

      {/* Event Logs viewer */}
      <div className="bg-black/25 dark:bg-black/50 p-3 rounded-xl border border-border/40 font-mono text-[10px] text-amber-500/90 h-[110px] overflow-y-auto space-y-1">
        {quickActionsLog.map((log, idx) => (
          <div key={idx} className="truncate">
            <span className="text-muted-foreground/60">[{idx}]</span> {log}
          </div>
        ))}
      </div>
    </div>
  );
}
