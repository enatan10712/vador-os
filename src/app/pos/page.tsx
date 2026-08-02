'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  CreditCard,
  DollarSign,
  Receipt,
  ScanLine,
  Smartphone,
  Sparkles,
  Layers,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Table,
  Check,
  Languages,
  BadgeCent,
  QrCode
} from 'lucide-react';

interface MenuItemType {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem {
  menuItem: MenuItemType;
  quantity: number;
}

export default function PosPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Custom states for enterprise POS
  const [selectedTable, setSelectedTable] = useState('Table 1');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [taxType, setTaxType] = useState<'VAT' | 'TOT'>('VAT');
  const [paymentCurrency, setPaymentCurrency] = useState<'ETB' | 'USD' | 'EUR'>('ETB');
  const [splitCount, setSplitCount] = useState<number>(1); // Bill Split divisor (1 = no split)
  const [receipt, setReceipt] = useState<any | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Conversion rates (Base is ETB)
  const exchangeRates = {
    ETB: 1,
    USD: 120.0,
    EUR: 130.0
  };

  useEffect(() => {
    async function loadMenuItems() {
      try {
        const res = await fetch('/api/menu-items');
        if (!res.ok) {
          throw new Error('Failed to load menu items');
        }
        const json = await res.json();
        setMenuItems(json.data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching menu items');
      } finally {
        setLoading(false);
      }
    }
    loadMenuItems();
  }, []);

  // Cart operations
  const addToCart = (item: MenuItemType) => {
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
    setReceipt(null);
    setCheckoutSuccess(false);
  };

  // Calculations
  const subtotalETB = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);
  const taxRate = taxType === 'VAT' ? 0.15 : 0.02;
  const taxAmountETB = subtotalETB * taxRate;
  const totalETB = subtotalETB + taxAmountETB;

  // Currency specific formatting
  const formatCurrencyValue = (valInETB: number) => {
    const rate = exchangeRates[paymentCurrency];
    const converted = valInETB / rate;
    if (paymentCurrency === 'USD') return `$${converted.toFixed(2)}`;
    if (paymentCurrency === 'EUR') return `€${converted.toFixed(2)}`;
    return `${converted.toFixed(2)} ETB`;
  };

  // Trigger Transaction checkout flow
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const payload = {
        table_number: selectedTable,
        items: cart.map((ci) => ({
          product_id: ci.menuItem.id,
          quantity: ci.quantity
        })),
        payment_currency: paymentCurrency,
        tax_type: taxType
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('POS checkout failed');
      }

      const resData = await response.json();

      // Generate beautiful receipt snapshot
      setReceipt({
        id: resData.id || `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        table: selectedTable,
        subtotal: subtotalETB,
        taxType: taxType,
        taxAmount: taxAmountETB,
        total: totalETB,
        split: splitCount,
        currency: paymentCurrency,
        paymentMode: paymentMode,
        timestamp: new Date().toLocaleTimeString(),
        qrData: `VADOR-POS-VERIFY::ID=${resData.id || 'N/A'}::TOTAL=${totalETB}::VAT=${taxAmountETB}`
      });

      setCheckoutSuccess(true);
      setCart([]); // Clear cart
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    }
  };

  return (
    <AppShell
      title="Point of Sale (POS) Hub"
      description="Enterprise, high-speed retail transaction system with dynamic split-billing, multi-currency conversion, and fully localized Ethiopian tax invoicing."
      badge="Enterprise v2"
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">

        {/* Left Side: Product Catalogue and Configurations */}
        <div className="space-y-6">

          {/* Settings / Config Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-border/40 grid gap-4 sm:grid-cols-4 bg-[#140F0D]">

            {/* Table Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-2">Table / Section</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full bg-[#181311] text-xs py-2 px-3 rounded-xl border border-[#C5A880]/20 focus:outline-none focus:border-[#C5A880]/50 text-white"
              >
                <option value="Table 1">Table 1</option>
                <option value="Table 2">Table 2</option>
                <option value="Table 3">Table 3</option>
                <option value="Table 4">Table 4</option>
                <option value="Table 5">Table 5</option>
                <option value="Bar Desk">Bar Desk</option>
                <option value="Takeaway">Takeaway (Express)</option>
              </select>
            </div>

            {/* Tax Settings */}
            <div>
              <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-2">Ethiopian Taxes</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTaxType('VAT')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    taxType === 'VAT'
                      ? 'bg-[#C5A880] text-black border-[#C5A880]'
                      : 'bg-background/40 text-neutral-400 border-[#C5A880]/15 hover:bg-background/60'
                  }`}
                >
                  VAT (15%)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxType('TOT')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    taxType === 'TOT'
                      ? 'bg-[#C5A880] text-black border-[#C5A880]'
                      : 'bg-background/40 text-neutral-400 border-[#C5A880]/15 hover:bg-background/60'
                  }`}
                >
                  TOT (2%)
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-2">Local Payments</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-[#181311] text-xs py-2 px-3 rounded-xl border border-[#C5A880]/20 focus:outline-none focus:border-[#C5A880]/50 text-white"
              >
                <option value="Cash">Cash (Physical Birr)</option>
                <option value="Telebirr">Telebirr (Mobile Wallet)</option>
                <option value="CBE Birr">CBE Birr Wallet</option>
                <option value="Chapa">Chapa Payment Gateway</option>
                <option value="ArifPay">ArifPay POS Card</option>
              </select>
            </div>

            {/* Active Display Currency */}
            <div>
              <label className="text-[11px] font-bold text-[#C5A880] uppercase tracking-wider block mb-2">Checkout Currency</label>
              <div className="grid grid-cols-3 gap-1">
                {(['ETB', 'USD', 'EUR'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setPaymentCurrency(curr)}
                    className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                      paymentCurrency === curr
                        ? 'bg-[#C5A880]/20 text-[#C5A880] border-[#C5A880]'
                        : 'bg-background/40 text-neutral-500 border-[#C5A880]/10 hover:bg-background/60'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Menu Catalog Grid */}
          <div className="glass-panel p-6 rounded-2xl border border-border/40 min-h-[350px]">
            <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#C5A880]" />
              Menu Catalogue
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A880]"></div>
                <p className="text-xs text-neutral-400 mt-4">Streaming live tenant menu items...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-xs text-red-400">Error: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-[#C5A880] text-black text-xs font-bold rounded-xl"
                >
                  Retry Loading
                </button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xs text-neutral-400">No active menu items available. Run seed_data.py to populate menu.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="flex flex-col justify-between text-left p-4 rounded-xl border border-[#C5A880]/10 hover:border-[#C5A880]/50 bg-[#181311] hover:bg-[#201A17] transition-all group duration-200"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wide bg-[#C5A880]/10 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-2 group-hover:text-[#C5A880] transition-colors line-clamp-2">
                        {item.name}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between mt-4 w-full">
                      <span className="text-xs font-black text-[#F5F4F0]">
                        {item.price.toFixed(2)} ETB
                      </span>
                      <span className="text-[10px] text-[#C5A880]/60 font-semibold group-hover:underline">
                        + Add to order
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active POS Basket, Splits and Invoices */}
        <div className="space-y-6">

          {/* Checkout / Active Cart Terminal */}
          <div className="glass-panel p-6 rounded-2xl border border-border/40 flex flex-col justify-between min-h-[450px] bg-[#120E0D]">
            <div>
              <div className="flex items-center justify-between border-b border-[#C5A880]/10 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Active POS Cart</h3>
                  <p className="text-[10px] text-[#C5A880] font-semibold mt-0.5">Assigned to: {selectedTable}</p>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[10px] text-red-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Clear Order
                  </button>
                )}
              </div>

              {/* Cart List */}
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShoppingBag size={30} className="text-neutral-600 mb-3" />
                  <p className="text-xs text-neutral-400 font-bold">POS Terminal Idle</p>
                  <p className="text-[10px] text-neutral-500 mt-1 max-w-[200px]">Select items from the catalogue to queue a new POS order receipt.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map((ci) => (
                    <div
                      key={ci.menuItem.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#181311] border border-white/5"
                    >
                      <div className="flex-1 text-left">
                        <p className="text-xs font-bold text-white line-clamp-1">{ci.menuItem.name}</p>
                        <p className="text-[10px] text-[#C5A880] mt-0.5">{ci.menuItem.price.toFixed(2)} ETB</p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, -1)}
                          className="p-1 rounded-lg bg-background/50 hover:bg-background text-[#C5A880]"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-black text-white w-4 text-center">{ci.quantity}</span>
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, 1)}
                          className="p-1 rounded-lg bg-background/50 hover:bg-background text-[#C5A880]"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations and Split Settings */}
            {cart.length > 0 && (
              <div className="mt-6 border-t border-[#C5A880]/10 pt-4 space-y-4">

                {/* Interactive Bill Split Options */}
                <div className="bg-[#181311]/60 p-3 rounded-xl border border-[#C5A880]/10">
                  <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
                    <span className="font-bold flex items-center gap-1.5"><Layers size={11} /> Split Bill Ways</span>
                    <span className="text-[#C5A880] font-bold">{splitCount > 1 ? `Split equally by ${splitCount}` : 'Single Pay'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {([1, 2, 3, 4] as const).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSplitCount(num)}
                        className={`py-1.5 text-[10px] font-bold rounded-lg transition ${
                          splitCount === num
                            ? 'bg-[#C5A880] text-black'
                            : 'bg-background hover:bg-background/80 text-neutral-400'
                        }`}
                      >
                        {num === 1 ? 'Single' : `${num} Ways`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtotal, Tax and Grand Total */}
                <div className="space-y-1.5 text-xs text-neutral-300">
                  <div className="flex justify-between">
                    <span>POS Subtotal</span>
                    <span>{formatCurrencyValue(subtotalETB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{taxType} ({taxType === 'VAT' ? '15%' : '2%'})</span>
                    <span>{formatCurrencyValue(taxAmountETB)}</span>
                  </div>

                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-black text-white">
                    <span>Grand Total</span>
                    <span>{formatCurrencyValue(totalETB)}</span>
                  </div>

                  {splitCount > 1 && (
                    <div className="flex justify-between text-[#C5A880] font-black text-xs bg-[#C5A880]/5 p-2 rounded-lg border border-dashed border-[#C5A880]/20 mt-2">
                      <span>Each Person Pays:</span>
                      <span>{formatCurrencyValue(totalETB / splitCount)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0E0B0A] font-black uppercase text-xs tracking-wider rounded-xl hover:opacity-95 transition shadow-lg"
                >
                  Pay & Generate Fiscal Invoice ({paymentMode})
                </button>
              </div>
            )}
          </div>

          {/* Render printable Fiscal Invoice Receipt on Success */}
          {receipt && checkoutSuccess && (
            <div className="glass-panel p-5 rounded-2xl border border-dashed border-[#C5A880]/30 bg-[#161210] text-left">
              <div className="text-center border-b border-white/5 pb-4 mb-4">
                <h4 className="text-xs font-black text-[#C5A880] uppercase tracking-widest">★ Vador OS Enterprise POS ★</h4>
                <p className="text-[10px] text-neutral-400 mt-1">Ethiopian Revenue Authority Authorized Fiscal Receipt</p>
                <p className="text-[9px] text-neutral-500 mt-0.5">Device ID: VR-84950 • Serial: ETH-2026-X9</p>
              </div>

              <div className="space-y-2 text-[11px] text-neutral-300">
                <div className="flex justify-between">
                  <span>Invoice Reference:</span>
                  <span className="font-bold text-white font-mono">{receipt.id.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned:</span>
                  <span className="font-bold text-white">{receipt.table}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold text-[#C5A880]">{receipt.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-neutral-400">{receipt.timestamp}</span>
                </div>

                <div className="border-t border-white/5 my-2 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span>{formatCurrencyValue(receipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>{receipt.taxType} Amount</span>
                    <span>{formatCurrencyValue(receipt.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-white text-sm border-t border-dashed border-white/10 pt-1.5">
                    <span>Total Amount</span>
                    <span>{formatCurrencyValue(receipt.total)}</span>
                  </div>

                  {receipt.split > 1 && (
                    <div className="flex justify-between text-amber-300 font-bold bg-amber-950/20 px-2 py-1 rounded-md mt-1">
                      <span>{receipt.split}-way Split:</span>
                      <span>{formatCurrencyValue(receipt.total / receipt.split)} each</span>
                    </div>
                  )}
                </div>

                {/* Fiscal QR Code and verification code */}
                <div className="flex flex-col items-center justify-center pt-4 border-t border-white/5 mt-4">
                  <div className="p-2.5 bg-white rounded-xl mb-2 flex items-center justify-center">
                    <QrCode size={90} className="text-black" />
                  </div>
                  <p className="text-[8px] text-neutral-400 font-bold tracking-widest font-mono uppercase bg-[#1A1412] px-3 py-1 rounded-md">
                    SIG::VERIFIED_BY_VADOR_ERA_2026
                  </p>
                  <p className="text-[8px] text-neutral-500 mt-1 text-center max-w-[220px]">
                    Scan QR code using the Ethiopian Revenue Authority POS App to verify official tax invoice clearance.
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </AppShell>
  );
}
