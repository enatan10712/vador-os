/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import {
  TrendingUp,
  RotateCw,
  Search,
  Plus,
  ArrowRightLeft,
  FileText,
  Trash2,
  Camera,
  Sparkles,
  Download,
  Upload,
  Layers,
  ShoppingCart,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock list of locations for multi-tenant centralized reporting
const LOCATIONS = [
  { id: '1', name: 'Main Cafe & Restaurant' },
  { id: '2', name: 'Central Warehouse' },
  { id: '3', name: 'Storage Room A' },
  { id: '4', name: 'Sidama Bar Station' }
];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'pos' | 'recipes' | 'transfers' | 'waste' | 'counts' | 'ai'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [wasteLogs, setWasteLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and search states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('1');

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [scanMsg, setScanResultMsg] = useState('');

  // Creation modals
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createItemForm, setCreateItemForm] = useState({
    name: '', unit: 'kg', sku: '', barcode: '', display_name: '',
    category: 'Produce', brand: '', storage_type: 'Dry Storage',
    quantity_on_hand: '50.0', reorder_threshold: '10.0',
    average_cost: '2.5', supplier_id: ''
  });

  const [createPoOpen, setCreatePOOpen] = useState(false);
  const [createPoForm, setCreatePoForm] = useState({
    supplier_id: '',
    items: [{ item_id: '', qty: '10', unit_cost: '1.5' }]
  });

  const [createRecipeOpen, setCreateRecipeOpen] = useState(false);
  const [createRecipeForm, setCreateRecipeForm] = useState({
    menu_item_name: 'Harar Roast Flat White',
    menu_item_price: '4.50',
    ingredients: [{ item_id: '', qty: '0.015', unit: 'kg' }]
  });

  const [createTransferOpen, setCreateTransferOpen] = useState(false);
  const [createTransferForm, setCreateTransferForm] = useState({
    source_id: '',
    destination_id: '',
    items: [{ item_id: '', qty: '5' }]
  });

  const [createWasteOpen, setCreateWasteOpen] = useState(false);
  const [createWasteForm, setCreateWasteForm] = useState({
    item_id: '',
    qty: '1.0',
    reason_code: 'spoilage'
  });

  const [createCountOpen, setCreateCountOpen] = useState(false);
  const [countSessionForm, setCountSessionForm] = useState({
    type: 'cycle'
  });

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const resItems = await fetch(`/api/inventory?search=${search}&category=${categoryFilter}&status=${statusFilter}`);
      const dataItems = await resItems.json();
      setItems(dataItems.data || []);

      const resSuppliers = await fetch('/api/suppliers/');
      const dataSuppliers = await resSuppliers.json();
      setSuppliers(dataSuppliers.data || []);

      const resPos = await fetch('/api/purchase-orders/');
      const dataPos = await resPos.json();
      setPos(dataPos.data || []);

      const resRecipes = await fetch('/api/recipes/');
      const dataRecipes = await resRecipes.json();
      setRecipes(dataRecipes.data || []);

      const resTransfers = await fetch('/api/transfers/');
      const dataTransfers = await resTransfers.json();
      setTransfers(dataTransfers.data || []);

      const resWaste = await fetch('/api/waste/');
      const dataWaste = await resWaste.json();
      setWasteLogs(dataWaste.data || []);

      const resCounts = await fetch('/api/counts/');
      const dataCounts = await resCounts.json();
      setCounts(dataCounts.data || []);

      const resAi = await fetch('/api/ai/recommendations/');
      const dataAi = await resAi.json();
      setAiRecs(dataAi.recommendations || []);

    } catch (err) {
      console.error('Error loading enterprise inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [search, categoryFilter, statusFilter]);

  // Handlers
  const handleUpdateStock = async (itemId: string, delta: number) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ item_id: itemId, quantity_delta: delta })
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(createItemForm)
      });
      if (res.ok) {
        setCreateItemOpen(false);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePOAction = async (poId: string, action: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/action/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferAction = async (transferId: string, action: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/action/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCountAction = async (countId: string, action: string, actuals?: any) => {
    try {
      const bodyPayload: any = { action };
      if (actuals) {
        bodyPayload.counts = actuals;
      }
      const res = await fetch(`/api/counts/${countId}/action/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScanCode = async (code: string) => {
    try {
      const res = await fetch(`/api/barcode/scan/?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setScanResultMsg(`Match found: ${data.name} (${data.quantity} ${data.unit})`);
      } else {
        setScanResultMsg('No matching inventory SKU or Barcode found in system.');
      }
    } catch (err) {
      setScanResultMsg('Scanner offline.');
    }
  };

  const handleExportCSV = () => {
    window.open('/api/inventory/export/');
  };

  const handleImportMockCSV = async () => {
    const mockCSV = "Name,Unit,Quantity,Threshold,SKU\nYirgacheffe Arabica,kg,75.0,15.0,SKU-YIRGA-COFFEE\nFresh Organic Dairy,L,120.0,20.0,SKU-FRESH-MILK\nSpiced Cardamom,g,1500.0,300.0,SKU-CARDAMOM";
    try {
      const res = await fetch('/api/inventory/import/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ csv_data: mockCSV })
      });
      if (res.ok) {
        alert('Mock CSV imported successfully! Added 3 products.');
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.average_cost), 0);
  const itemsLow = items.filter(item => item.quantity <= item.threshold).length;
  const itemsOut = items.filter(item => item.quantity <= 0).length;
  const totalWaste = wasteLogs.reduce((acc, l) => acc + l.cost, 0);

  return (
    <AppShell title="Enterprise Inventory Suite" description="Toast, Restaurant365, & Oracle Simphony-grade supply chain platform." badge="Enterprise v2026">

      {/* ─── SUMMARY KPI WIDGETS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Total Stock Value</p>
          <p className="text-xl font-black mt-1 text-[#C5A880]">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="text-[9px] mt-1.5 text-neutral-500 font-semibold flex items-center gap-1">
            <TrendingUp size={10} className="text-emerald-500" />
            <span className="text-emerald-500">Live Valuation</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Today&apos;s Waste</p>
          <p className="text-xl font-black mt-1 text-red-500">${totalWaste.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="text-[9px] mt-1.5 text-neutral-500 font-semibold">
            <span>Spoilage & Cooking Loss</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Items Running Low</p>
          <p className="text-xl font-black mt-1 text-amber-500">{itemsLow}</p>
          <div className="text-[9px] mt-1.5 text-amber-500 font-bold">
            <span>Critical levels reached</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Out of Stock</p>
          <p className="text-xl font-black mt-1 text-red-600">{itemsOut}</p>
          <div className="text-[9px] mt-1.5 text-neutral-500 font-semibold">
            <span>Requires instant PO</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Pending POs</p>
          <p className="text-xl font-black mt-1 text-emerald-400">{pos.filter(p => p.status !== 'received' && p.status !== 'cancelled').length}</p>
          <div className="text-[9px] mt-1.5 text-neutral-500 font-semibold">
            <span>Incoming shipments</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C5A880]/15 bg-[#140F0D] p-4 text-left">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Food Cost %</p>
          <p className="text-xl font-black mt-1 text-[#C5A880]">28.4%</p>
          <div className="text-[9px] mt-1.5 text-emerald-500 font-black">
            <span>Optimum Target Match</span>
          </div>
        </div>
      </div>

      {/* ─── SEARCH, ACTIONS & CONTROLS ────────────────────────────────────────── */}
      <div className="glass-panel p-4 rounded-2xl border border-border/40 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Global Search (SKU, barcode, name)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181311] hover:bg-[#201A17] focus:bg-[#120E0D] text-xs pl-10 pr-4 py-2 rounded-xl border border-[#C5A880]/15 focus:border-[#C5A880]/50 focus:outline-none text-[#F5F4F0] transition"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#181311] border border-[#C5A880]/15 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:outline-none focus:border-[#C5A880]/50"
          >
            <option value="">All Categories</option>
            <option value="Produce">Produce</option>
            <option value="Dairy">Dairy</option>
            <option value="Dry Storage">Dry Storage</option>
            <option value="Beverages">Beverages</option>
            <option value="Alcohol">Alcohol</option>
            <option value="Small wares">Small Wares & Equipment</option>
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-[#181311] border border-[#C5A880]/15 rounded-xl px-3 py-2 text-xs text-[#F5F4F0] focus:outline-none"
          >
            {LOCATIONS.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-[#181311] hover:bg-[#201A17] text-[#C5A880] border border-[#C5A880]/20 rounded-xl transition font-bold"
          >
            <Camera size={13} />
            <span>Scan Camera/Barcode</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-[#181311] hover:bg-[#201A17] text-neutral-300 border border-neutral-800 rounded-xl transition font-semibold"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleImportMockCSV}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-[#181311] hover:bg-[#201A17] text-neutral-300 border border-neutral-800 rounded-xl transition font-semibold"
          >
            <Upload size={13} />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setCreateItemOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] hover:opacity-95 text-[#0B0A09] rounded-xl font-bold transition"
          >
            <Plus size={13} />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* ─── MODULE TABS ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/5 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'items' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <Layers size={13} />
          <span>Ingredients ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'pos' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <ShoppingCart size={13} />
          <span>Purchase Orders ({pos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'recipes' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <FileText size={13} />
          <span>Plate Recipes ({recipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'transfers' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <ArrowRightLeft size={13} />
          <span>Stock Transfers ({transfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('waste')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'waste' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <Trash2 size={13} />
          <span>Waste Logs ({wasteLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('counts')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'counts' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <ClipboardList size={13} />
          <span>Inventory Counts ({counts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${activeTab === 'ai' ? 'border-[#C5A880] text-white' : 'border-transparent text-neutral-400'}`}
        >
          <Sparkles size={13} className="text-[#C5A880]" />
          <span>AI Insights ({aiRecs.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <RotateCw className="animate-spin text-[#C5A880] mb-3" size={32} />
          <p className="text-xs font-bold tracking-widest uppercase">Fetching Supply Chain State...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ─── TAB: INGREDIENTS / ITEMS ────────────────────────────────────────── */}
          {activeTab === 'items' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0E0B0A]">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#181311] text-[10px] uppercase font-bold text-neutral-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">SKU / Code</th>
                      <th className="p-4">Ingredient Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Available Stock</th>
                      <th className="p-4 text-right">Avg Cost</th>
                      <th className="p-4 text-right">Min / Threshold</th>
                      <th className="p-4">Preferred Supplier</th>
                      <th className="p-4 text-right">Quick Stock delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-[#181311]/50 transition-colors">
                        <td className="p-4 font-mono text-neutral-400">{item.sku}</td>
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.quantity <= item.threshold && (
                            <span className="px-1.5 py-0.5 rounded-md bg-red-950/20 text-red-500 border border-red-500/20 text-[9px] font-bold">LOW</span>
                          )}
                        </td>
                        <td className="p-4 text-neutral-400">{item.category}</td>
                        <td className="p-4 text-right font-black text-white">{item.quantity} {item.unit}</td>
                        <td className="p-4 text-right text-emerald-400">${item.average_cost.toFixed(2)}</td>
                        <td className="p-4 text-right text-neutral-400">{item.threshold} {item.unit}</td>
                        <td className="p-4 text-neutral-400 font-semibold">{item.supplier_name || 'N/A'}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => handleUpdateStock(item.id, -1)} className="px-2 py-1 bg-red-950/20 text-red-400 border border-red-500/25 rounded-lg text-[10px] font-bold hover:bg-red-950/40">-1</button>
                            <button onClick={() => handleUpdateStock(item.id, 5)} className="px-2 py-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-[10px] font-bold hover:bg-emerald-950/40">+5</button>
                            <button onClick={() => handleUpdateStock(item.id, 20)} className="px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-[10px] font-bold hover:bg-emerald-950/50">+20</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ─── TAB: PURCHASE ORDERS ────────────────────────────────────────────── */}
          {activeTab === 'pos' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Purchase Orders Logs</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {pos.map((po: any) => (
                  <div key={po.id} className="rounded-2xl border border-white/5 bg-[#0E0B0A] p-5 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-white tracking-widest">{po.po_number}</p>
                        <p className="text-[11px] text-neutral-400 mt-1 font-semibold">Supplier: {po.supplier_name}</p>
                        <p className="text-[11px] text-neutral-400 font-semibold">Total Cost: <span className="text-[#C5A880] font-black">${po.total_cost.toFixed(2)}</span></p>
                      </div>
                      <span className={`px-2 py-1 rounded-xl text-[10px] font-bold ${
                        po.status === 'received' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' :
                        po.status === 'draft' ? 'bg-neutral-900 text-neutral-400 border border-neutral-700' :
                        'bg-amber-950/20 text-amber-400 border border-amber-500/20'
                      }`}>
                        {po.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-white/5 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Order Items</p>
                      <ul className="mt-1.5 space-y-1 text-[11px] text-neutral-300">
                        {po.items?.map((item: any) => (
                          <li key={item.id} className="flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-mono text-neutral-400">{item.qty_ordered} ordered • {item.qty_received} received</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex gap-2 justify-end border-t border-white/5 pt-3">
                      {po.status === 'draft' && (
                        <button onClick={() => handlePOAction(po.id, 'submit')} className="px-2.5 py-1.5 bg-[#181311] hover:bg-[#201A17] text-xs font-bold text-[#C5A880] border border-[#C5A880]/20 rounded-lg">Submit PO</button>
                      )}
                      {po.status === 'submitted' && (
                        <button onClick={() => handlePOAction(po.id, 'approve')} className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-500 border border-amber-500/20 rounded-lg">Approve PO</button>
                      )}
                      {po.status === 'approved' && (
                        <button onClick={() => handlePOAction(po.id, 'order')} className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-500 border border-emerald-500/20 rounded-lg">Send to Supplier</button>
                      )}
                      {po.status === 'ordered' && (
                        <button onClick={() => handlePOAction(po.id, 'receive')} className="px-2.5 py-1.5 bg-emerald-500/15 text-xs font-black text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25">Receive Goods (Add Stock)</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── TAB: RECIPES ────────────────────────────────────────────────────── */}
          {activeTab === 'recipes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 md:grid-cols-3">
              {recipes.map((rec: any) => (
                <div key={rec.id} className="rounded-2xl border border-white/5 bg-[#0E0B0A] p-5">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-black text-white uppercase">{rec.menu_item_name}</h4>
                    <span className="text-[10px] text-neutral-400">Yield: {rec.portion_size || '1 portion'}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Ingredients Used</p>
                    {rec.ingredients?.map((ing: any) => (
                      <div key={ing.id} className="flex justify-between text-[11px] text-neutral-300">
                        <span>{ing.name}</span>
                        <span className="font-mono text-neutral-400">{ing.qty} {ing.unit} (${ing.cost.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[#181311] p-1.5">
                      <p className="text-[8px] text-neutral-400 font-bold uppercase">Plate Cost</p>
                      <p className="text-xs text-red-500 font-bold">${rec.cost_per_portion.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-[#181311] p-1.5">
                      <p className="text-[8px] text-neutral-400 font-bold uppercase">POS Price</p>
                      <p className="text-xs text-[#C5A880] font-bold">${rec.menu_item_price.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-[#181311] p-1.5">
                      <p className="text-[8px] text-neutral-400 font-bold uppercase">Margin %</p>
                      <p className="text-xs text-emerald-400 font-bold">{rec.margin_percent.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ─── TAB: TRANSFERS ─────────────────────────────────────────────────── */}
          {activeTab === 'transfers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0E0B0A]">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#181311] text-[10px] uppercase font-bold text-neutral-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">Transfer #</th>
                      <th className="p-4">Source</th>
                      <th className="p-4">Destination</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Ingredients requested</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transfers.map((t: any) => (
                      <tr key={t.id} className="hover:bg-[#181311]/50 transition-colors">
                        <td className="p-4 font-mono font-bold">{t.transfer_number}</td>
                        <td className="p-4 text-neutral-300">{t.source}</td>
                        <td className="p-4 text-neutral-300">{t.destination}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                            t.status === 'received' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950/20 text-amber-400 border border-amber-500/20'
                          }`}>{t.status.toUpperCase()}</span>
                        </td>
                        <td className="p-4 text-neutral-400">
                          {t.items?.map((it: any) => `${it.item_name} (${it.qty_requested})`).join(', ')}
                        </td>
                        <td className="p-4 text-right">
                          {t.status === 'requested' && (
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => handleTransferAction(t.id, 'approve')} className="px-2 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">Approve</button>
                            </div>
                          )}
                          {t.status === 'approved' && (
                            <button onClick={() => handleTransferAction(t.id, 'ship')} className="px-2 py-1 text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md">Ship Items</button>
                          )}
                          {t.status === 'shipped' && (
                            <button onClick={() => handleTransferAction(t.id, 'receive')} className="px-2 py-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-md">Receive Stock</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ─── TAB: WASTE ──────────────────────────────────────────────────────── */}
          {activeTab === 'waste' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0E0B0A]">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#181311] text-[10px] uppercase font-bold text-neutral-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">Logged At</th>
                      <th className="p-4">Ingredient Name</th>
                      <th className="p-4">Quantity Wasted</th>
                      <th className="p-4">Wasted Cost</th>
                      <th className="p-4">Reason Code</th>
                      <th className="p-4">Responsible Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {wasteLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#181311]/50 transition-colors">
                        <td className="p-4 text-neutral-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-white">{log.item_name}</td>
                        <td className="p-4 text-red-400 font-bold">{log.qty}</td>
                        <td className="p-4 text-red-500 font-black">${log.cost.toFixed(2)}</td>
                        <td className="p-4 font-bold text-[#C5A880]">{log.reason_code.toUpperCase()}</td>
                        <td className="p-4 text-neutral-400">{log.responsible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ─── TAB: CYCLES & PHYSICAL COUNTS ──────────────────────────────────── */}
          {activeTab === 'counts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {counts.map((s: any) => (
                  <div key={s.id} className="rounded-2xl border border-white/5 bg-[#0E0B0A] p-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black uppercase text-white tracking-widest">{s.count_number}</p>
                        <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Type: {s.type.toUpperCase()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                        s.status === 'approved' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}>{s.status.toUpperCase()}</span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[10px] font-bold uppercase text-neutral-400">Variances Tracked</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-neutral-300">
                        {s.items?.map((item: any) => (
                          <li key={item.id} className="flex justify-between">
                            <span>{item.item_name}</span>
                            <span className={`font-mono font-bold ${item.variance < 0 ? 'text-red-500' : item.variance > 0 ? 'text-emerald-500' : 'text-neutral-500'}`}>
                              {item.variance !== null ? `${item.variance > 0 ? '+' : ''}${item.variance}` : 'pending'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex gap-2 justify-end border-t border-white/5 pt-3">
                      {s.status === 'scheduled' && (
                        <button
                          onClick={() => handleCountAction(s.id, 'submit_counts', { [items[0]?.id]: 48.0 })} // simulate counted 48
                          className="px-2.5 py-1.5 bg-[#181311] hover:bg-[#201A17] text-xs font-bold text-[#C5A880] border border-[#C5A880]/20 rounded-lg"
                        >
                          Submit Count Sheet
                        </button>
                      )}
                      {s.status === 'completed' && (
                        <button
                          onClick={() => handleCountAction(s.id, 'approve')}
                          className="px-2.5 py-1.5 bg-emerald-500/15 text-xs font-black text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25"
                        >
                          Approve Count Sheet
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── TAB: AI INSIGHTS ───────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-[#C5A880] animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">AI Supply Chain Forecaster (2026)</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {aiRecs.map((rec: any, index: number) => (
                  <div key={index} className="rounded-2xl border border-[#C5A880]/15 bg-gradient-to-r from-amber-500/5 to-transparent p-5">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#C5A880]" />
                        <span>{rec.title}</span>
                      </h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                        rec.priority === 'high' ? 'bg-red-950/20 text-red-400 border border-red-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-neutral-400 mt-2.5 leading-relaxed">{rec.detail}</p>
                    <div className="mt-4 pt-2.5 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      <span>Projected Capital Impact:</span>
                      <span className="text-lg font-black">{rec.impact_savings || '$120.00'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ─── MODAL: ADD INGREDIENT ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {createItemOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-96 rounded-2xl border border-white/10 bg-[#0E0B0A] p-6 text-left shadow-2xl">
              <h3 className="text-sm font-black uppercase text-white tracking-widest mb-4">Add Ingredient</h3>
              <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Ingredient Name</label>
                  <input required type="text" className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.name} onChange={(e) => setCreateItemForm({ ...createItemForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Stock Unit</label>
                    <input required type="text" className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.unit} onChange={(e) => setCreateItemForm({ ...createItemForm, unit: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Category</label>
                    <select className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.category} onChange={(e) => setCreateItemForm({ ...createItemForm, category: e.target.value })}>
                      <option value="Produce">Produce</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Dry Storage">Dry Storage</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Alcohol">Alcohol</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Initial Stock</label>
                    <input type="text" className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.quantity_on_hand} onChange={(e) => setCreateItemForm({ ...createItemForm, quantity_on_hand: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Safety Threshold</label>
                    <input type="text" className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.reorder_threshold} onChange={(e) => setCreateItemForm({ ...createItemForm, reorder_threshold: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Preferred Supplier</label>
                  <select className="w-full bg-[#181311] border border-white/10 rounded-lg p-2.5 text-white" value={createItemForm.supplier_id} onChange={(e) => setCreateItemForm({ ...createItemForm, supplier_id: e.target.value })}>
                    <option value="">None</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2 justify-end">
                  <button type="button" onClick={() => setCreateItemOpen(false)} className="px-4 py-2 border border-white/10 rounded-lg font-bold text-neutral-400">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] font-bold rounded-lg">Add Ingredient</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CAMERA SCANNER ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {scannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-96 rounded-2xl border border-white/10 bg-[#0E0B0A] p-6 text-center shadow-2xl">
              <h3 className="text-sm font-black uppercase text-white tracking-widest mb-4">Mobile Camera / Barcode Scanner</h3>
              <div className="aspect-video bg-neutral-900 border border-white/5 rounded-xl flex items-center justify-center text-neutral-400 relative mb-4">
                <Camera size={32} className="animate-pulse" />
                <span className="absolute bottom-2 text-[10px] font-bold uppercase text-neutral-500">Camera View Active</span>
              </div>
              <input
                type="text"
                placeholder="Simulate barcode swipe..."
                value={scanResult}
                onChange={(e) => setScanResult(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScanCode(scanResult);
                  }
                }}
                className="w-full bg-[#181311] text-xs border border-white/10 rounded-lg p-2.5 text-white mb-2 text-center"
              />
              <p className="text-xs text-neutral-400 font-bold mb-4">{scanMsg}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setScannerOpen(false)} className="px-4 py-2 border border-white/10 rounded-lg font-bold text-neutral-400 text-xs w-full">Close Scanner</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}
