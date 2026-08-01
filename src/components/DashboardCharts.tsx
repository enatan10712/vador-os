'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';
import { useStore } from '../store/useStore';
import { translations } from '../data/translations';
import { EmptyState } from './ui/EmptyState';
import {
  mockMonthlyPerformance,
  mockDailyPerformance,
  popularProducts
} from '../data/mockData';

const GOLD_COLORS = ['#C5A880', '#dfa95a', '#fef08a', '#10b981', '#3b82f6', '#ec4899', '#78716c'];

export default function DashboardCharts() {
  const { searchQuery, locale, formatCurrency } = useStore();
  const t = translations[locale];

  const filteredProducts = popularProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showEmptyProducts = filteredProducts.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Revenue & Orders Area Trend */}
      <div className="glass-panel p-5 lg:col-span-2 flex flex-col gap-4 h-[380px] bg-[#0E0B0A]/85 border border-[#C5A880]/15 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#C5A880]">{t.revenueTrend}</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">Year to Date performance trajectory</p>
          </div>
          <span className="text-[10px] bg-[#C5A880]/10 text-[#C5A880] px-2.5 py-1 rounded-full font-bold border border-[#C5A880]/20">{t.liveSync}</span>
        </div>

        <div className="flex-1 w-full text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockMonthlyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C5A880" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#C5A880" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
              <XAxis dataKey="name" stroke="#C5A880" fontSize={10} opacity={0.8} tickLine={false} />
              <YAxis stroke="#C5A880" fontSize={10} opacity={0.8} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0E0B0A',
                  border: '1px solid rgba(197, 168, 128, 0.2)',
                  borderRadius: '10px',
                  color: '#fafafa'
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area type="monotone" name={t.revenueLabel} dataKey="revenue" stroke="#C5A880" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" name={t.ordersLabel} dataKey="orders" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Hourly Performance Run */}
      <div className="glass-panel p-5 flex flex-col gap-4 h-[380px] bg-[#0E0B0A]/85 border border-[#C5A880]/15 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#C5A880]">{t.hourlyLoad}</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">Peak rush hours tracking</p>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold">{t.today}</span>
        </div>

        <div className="flex-1 w-full text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockDailyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
              <XAxis dataKey="name" stroke="#C5A880" fontSize={9} opacity={0.8} tickLine={false} />
              <YAxis stroke="#C5A880" fontSize={9} opacity={0.8} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0E0B0A',
                  border: '1px solid rgba(197, 168, 128, 0.2)',
                  borderRadius: '10px',
                  color: '#fafafa'
                }}
              />
              <Bar name={t.revenueLabel} dataKey="revenue" fill="#C5A880" radius={[4, 4, 0, 0]}>
                {mockDailyPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 1 ? '#91795E' : '#C5A880'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product performance list and visual matrix */}
      <div className="glass-panel p-5 lg:col-span-3 flex flex-col gap-4 bg-[#0E0B0A]/85 border border-[#C5A880]/15 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#C5A880]">{t.popularProductsTitle}</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">Popular Coffee Beverages, Food and Pastries sorted by sales quantity</p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">Auto-Optimize</span>
        </div>

        {showEmptyProducts ? (
          <EmptyState
            title={t.popularProductsTitle}
            description="No products matched the current search. Clear the search field to restore the full catalog."
            className="min-h-[260px]"
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-neutral-400">
                <th className="pb-2.5 font-semibold text-[10px] uppercase tracking-wider">Item Name</th>
                <th className="pb-2.5 font-semibold text-[10px] uppercase tracking-wider">Category</th>
                <th className="pb-2.5 font-semibold text-right text-[10px] uppercase tracking-wider">Units Sold</th>
                <th className="pb-2.5 font-semibold text-right text-[10px] uppercase tracking-wider">Revenue</th>
                <th className="pb-2.5 font-semibold text-right text-[10px] uppercase tracking-wider">In-Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-all">
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD_COLORS[idx % GOLD_COLORS.length] }} />
                    {p.name}
                  </td>
                  <td className="py-3 text-neutral-400">{p.category}</td>
                  <td className="py-3 text-right font-semibold text-white">{p.sales.toLocaleString()}</td>
                  <td className="py-3 text-right font-semibold text-emerald-500">{formatCurrency(p.revenue)}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      p.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      p.status === 'Low Stock' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {p.status === 'In Stock' ? t.inStock : p.status === 'Low Stock' ? t.lowStock : t.outOfStock} ({p.stock} left)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
