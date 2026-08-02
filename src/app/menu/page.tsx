'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  ShoppingBag,
  Heart,
  Search,
  Sparkles,
  ChevronRight,
  X,
  Plus,
  Minus,
  Check,
  Star,
  MessageSquare,
  Bell,
  CreditCard,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { translations } from '../../data/translations';

interface MenuItem {
  id: string;
  name: string;
  nameAm: string;
  price: number;
  category: 'Signatures' | 'Espresso & Coffee' | 'Boulangerie & Pastry' | 'Signature All-Day Mains' | 'Fine Teas & Matcha';
  categoryAm: 'የተለዩ መጠጦች' | 'ኤስፕሬሶ እና ቡና' | 'መጋገሪያዎች' | 'ልዩ ምግቦች' | 'ሻይ እና ማቻ';
  description: string;
  descriptionAm: string;
  image: string;
  tags: string[];
  tagsAm: string[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'p1',
    name: 'Vendor Signature Nitro Cold Brew',
    nameAm: 'የቬንዶር ልዩ ናይትሮ ቀዝቃዛ ቡና',
    price: 180.00,
    category: 'Signatures',
    categoryAm: 'የተለዩ መጠጦች',
    description: 'Nitrogen-infused premium single-origin Arabica cold brew. Rich, velvety, cascading head with dark chocolate & subtle berry notes.',
    descriptionAm: 'ናይትሮጅን የተቀላቀለበት ምርጥ የሐረር አራቢካ ቀዝቃዛ ቡና። ወፍራም፣ ለስላሳ፣ ከጥቁር ቸኮሌት እና የቤሪ ጣዕም ጋር።',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    tags: ['Best Seller', 'Ice Cold'],
    tagsAm: ['ተወዳጅ', 'ቀዝቃዛ']
  },
  {
    id: 'p2',
    name: 'Pistachio Butter Spanish Latte',
    nameAm: 'ፒስታቺዮ በትር ስፓኒሽ ላቴ',
    price: 240.00,
    category: 'Signatures',
    categoryAm: 'የተለዩ መጠጦች',
    description: 'Two shots of signature organic espresso, steamed oat milk, condensed milk, and house-made artisan pistachio cream.',
    descriptionAm: 'ሁለት ሲንግል ኦሪጂን ኤስፕሬሶ፣ የሞቀ የኦት ወተት፣ ጣፋጭ ወተት እና ልዩ የፒስታቺዮ ክሬም።',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
    tags: ['Must Try', 'Hot or Iced'],
    tagsAm: ['ሊሞከር የሚገባው', 'ትኩስ ወይም አይስ']
  },
  {
    id: 'p3',
    name: 'Smoked Sea Salt Caramel Flat White',
    nameAm: 'የባህር ጨው ካራሜል ፍላት ዋይት',
    price: 195.00,
    category: 'Espresso & Coffee',
    categoryAm: 'ኤስፕሬሶ እና ቡና',
    description: 'Double shot ristretto, silky steamed whole milk, house-made sea-salt caramel sauce, light dusting of Maldon flakes.',
    descriptionAm: 'ድርብ ሪስትሬቶ፣ ለስላሳ የሞቀ ወተት፣ የቤት ውስጥ የባህር ጨው ካራሜል ሶስ።',
    image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80',
    tags: ['Popular'],
    tagsAm: ['ተወዳጅ']
  },
  {
    id: 'p4',
    name: 'Ceremonial Organic Matcha Latte',
    nameAm: 'የጃፓን ኦርጋኒክ ማቻ ላቴ',
    price: 210.00,
    category: 'Fine Teas & Matcha',
    categoryAm: 'ሻይ እና ማቻ',
    description: 'Stone-ground Uji ceremonial-grade matcha whisked to perfection, paired with silky coconut milk and raw organic agave.',
    descriptionAm: 'በጥንቃቄ የተፈጨ የጃፓን ምርጥ ማቻ፣ ከኮኮናት ወተት እና ኦርጋኒክ አጋቬ ጣፋጭ ጋር።',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    tags: ['Organic', 'Vibrant'],
    tagsAm: ['ኦርጋኒክ', 'ንቁ']
  },
  {
    id: 'p5',
    name: 'Artisan Sicilian Pistachio Croissant',
    nameAm: 'የሲሲሊ ፒስታቺዮ ክሮይሰንት',
    price: 175.00,
    category: 'Boulangerie & Pastry',
    categoryAm: 'መጋገሪያዎች',
    description: 'Twice-baked buttery, flaky 24-layer croissant filled with rich Sicilian pistachio frangipane, topped with chopped roasted pistachios.',
    descriptionAm: 'በጥንቃቄ የተጋገረ ቅቤ የበዛበት ክሮይሰንት በውስጡ ጣፋጭ የፒስታቺዮ ክሬም የያዘ።',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    tags: ['Freshly Baked', 'Vendor Treat'],
    tagsAm: ['ትኩስ መጋገሪያ', 'የቬንዶር ልዩ']
  },
  {
    id: 'p6',
    name: 'Avocado Sourdough Tartine',
    nameAm: 'አቮካዶ ተፍ ሳውረዶ ታርቲን',
    price: 280.00,
    category: 'Signature All-Day Mains',
    categoryAm: 'ልዩ ምግቦች',
    description: 'Toasted wild-yeast sourdough, organic Hass avocado mash, heirloom cherry tomatoes, cold-pressed olive oil drizzle, microgreens.',
    descriptionAm: 'የተጠበሰ የተፍ ሳውረዶ ዳቦ፣ ኦርጋኒክ አቮካዶ፣ የቼሪ ቲማቲሞች እና የወይራ ዘይት።',
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80',
    tags: ['Healthy', 'Satisfying'],
    tagsAm: ['ጤናማ', 'አጥጋቢ']
  },
  {
    id: 'p7',
    name: 'Eton Mess Cruffin',
    price: 165.00,
    nameAm: 'ኢተን ሜስ ክሩፊን ኬክ',
    category: 'Boulangerie & Pastry',
    categoryAm: 'መጋገሪያዎች',
    description: 'Hybrid croissant-muffin filled with whipped Tahitian vanilla bean cream, strawberry compote, and delicate crispy meringue pieces.',
    descriptionAm: 'የክሮይሰንት እና መፊን ውህድ የሆነ ልዩ ኬክ በውስጡ የቫኒላ ክሬም እና የስትሮውቤሪ ጭማቂ የያዘ።',
    image: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80',
    tags: ['Weekend Special'],
    tagsAm: ['የሳምንቱ መጨረሻ']
  },
  {
    id: 'p8',
    name: 'Smoked Salmon & Truffle Bagel',
    nameAm: 'የሳልሞን እና ትሩፍል ቤግል',
    price: 360.00,
    category: 'Signature All-Day Mains',
    categoryAm: 'ልዩ ምግቦች',
    description: 'Hand-rolled artisanal sesame bagel, premium Norwegian smoked salmon, truffle-infused cream cheese, capers, pickled red onions.',
    descriptionAm: 'በእጅ የተሰራ የሰሊጥ ቤግል ዳቦ፣ ምርጥ የኖርዌይ ሳልሞን ዓሳ፣ ከትሩፍል አይብ እና ቀይ ሽንኩርት ጋር።',
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80',
    tags: ['Luxurious', 'High Protein'],
    tagsAm: ['ልዩ የቅንጦት', 'ፕሮቲን የበዛበት']
  }
];

const CATEGORIES: MenuItem['category'][] = [
  'Signatures',
  'Espresso & Coffee',
  'Boulangerie & Pastry',
  'Signature All-Day Mains',
  'Fine Teas & Matcha'
];

function MenuContent() {
  const searchParams = useSearchParams();
  const storeTable = useStore((state) => state.tableNumber);
  const setTableNumber = useStore((state) => state.setTableNumber);
  const cart = useStore((state) => state.cart);
  const favorites = useStore((state) => state.favorites);
  const orderStatus = useStore((state) => state.orderStatus);
  const waiterCalled = useStore((state) => state.waiterCalled);
  const loyaltyPoints = useStore((state) => state.loyaltyPoints);
  const activeOrderItems = useStore((state) => state.activeOrderItems);
  const locale = useStore((state) => state.locale);
  const formatCurrency = useStore((state) => state.formatCurrency);
  const t = translations[locale];

  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartQuantity = useStore((state) => state.updateCartQuantity);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const placeOrder = useStore((state) => state.placeOrder);
  const callWaiter = useStore((state) => state.callWaiter);
  const requestBill = useStore((state) => state.requestBill);
  const submitFeedback = useStore((state) => state.submitFeedback);
  const resetCustomerOrder = useStore((state) => state.resetCustomerOrder);

  // Parse Table Parameter from URL
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      setTableNumber(locale === 'am' ? `ጠረጴዛ ${tableParam}` : `Table ${tableParam}`);
    } else {
      setTableNumber(locale === 'am' ? `ጠረጴዛ 1` : `Table 1`);
    }
  }, [searchParams, setTableNumber, locale]);

  // Local component states
  const [activeCategory, setActiveCategory] = useState<MenuItem['category']>('Signatures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  // Customization dialog state
  const [customSize, setCustomSize] = useState<'Standard' | 'Grande' | 'Venti'>('Standard');
  const [customMilk, setCustomMilk] = useState<'Whole Milk' | 'Oat Milk (+ $0.50)' | 'Almond Milk (+ $0.50)' | 'None'>('Whole Milk');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);

  // Cart, Bill, and Service Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Feedback stars local
  const [ratingInput, setRatingInput] = useState(5);
  const [feedbackCommentInput, setFeedbackCommentInput] = useState('');

  // Tab filter
  const filteredProducts = MENU_ITEMS.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = locale === 'am'
      ? item.nameAm.toLowerCase().includes(searchQuery.toLowerCase()) || item.descriptionAm.toLowerCase().includes(searchQuery.toLowerCase())
      : item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCustomizedTotalPrice = (basePrice: number) => {
    let price = basePrice;
    if (customSize === 'Grande') price += 35;
    if (customSize === 'Venti') price += 70;
    if (customMilk === 'Oat Milk (+ $0.50)' || customMilk === 'Almond Milk (+ $0.50)') price += 35;

    selectedToppings.forEach(topName => {
      if (topName.includes('Ristretto')) price += 70;
      else if (topName.includes('Pistachio')) price += 100;
      else if (topName.includes('Honey')) price += 35;
      else if (topName.includes('Eton')) price += 35;
    });

    return price * customQuantity;
  };

  const handleOpenCustomize = (product: MenuItem) => {
    setSelectedProduct(product);
    setCustomSize('Standard');
    setCustomMilk(product.category.includes('Pastry') || product.category.includes('Mains') ? 'None' : 'Whole Milk');
    setSelectedToppings([]);
    setSpecialNotes('');
    setCustomQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const basePrice = selectedProduct.price;
    addToCart({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: getCustomizedTotalPrice(basePrice) / customQuantity,
      image: selectedProduct.image,
      quantity: customQuantity,
      customizations: {
        size: customSize,
        milk: customMilk,
        toppings: selectedToppings,
        notes: specialNotes
      }
    });

    setSelectedProduct(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getActiveOrderTotal = () => {
    return activeOrderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <div className="min-h-screen bg-[#0B0A09] text-[#F5F4F0] font-sans overflow-x-hidden pb-32">
      {/* Luxury Background Accents */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#C5A880]/10 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] right-[-100px] w-[300px] h-[300px] rounded-full bg-[#C5A880]/5 blur-[120px] pointer-events-none" />

      {/* Table & Branding Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0B0A09]/80 backdrop-blur-xl border-b border-[#C5A880]/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C5A880] to-[#E5D5C0] flex items-center justify-center shadow-lg shadow-[#C5A880]/10">
            <Coffee className="w-5 h-5 text-[#0B0A09] stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase text-[#F5F4F0] flex items-center gap-1.5">
              Robusta <span className="text-[#C5A880] font-light">Coffee</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] text-[#C5A880] font-extrabold uppercase tracking-widest">{storeTable}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Simple Language switcher directly in menu for extreme UX perfection */}
          <div className="flex items-center gap-1 text-[10px] bg-[#1C1917] border border-[#C5A880]/15 rounded-full px-1.5 py-0.5 font-bold mr-1">
            <button
              onClick={() => useStore.getState().setLocale('en')}
              className={`px-1.5 py-0.5 rounded-full ${locale === 'en' ? 'bg-[#C5A880] text-black' : 'text-[#C5A880]'}`}
            >
              EN
            </button>
            <button
              onClick={() => useStore.getState().setLocale('am')}
              className={`px-1.5 py-0.5 rounded-full ${locale === 'am' ? 'bg-[#C5A880] text-black' : 'text-[#C5A880]'}`}
            >
              አማ
            </button>
          </div>

          <button
            onClick={() => setIsServiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1917] border border-[#C5A880]/20 text-xs text-[#C5A880] font-bold transition hover:bg-[#2E2925]"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{t.callWaiter}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">

        {/* Real-time Order Tracking Status Widget */}
        {orderStatus !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1C1917] to-[#12100F] border border-[#C5A880]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A880]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black text-[#C5A880] tracking-widest">{t.timelineTitle}</span>
                <h3 className="text-sm font-bold text-white mt-1">{t.timelineSubtitle}</h3>
              </div>
              <span className="px-2.5 py-1 bg-[#C5A880]/10 border border-[#C5A880]/20 rounded-full text-[10px] font-bold text-[#C5A880] uppercase tracking-wider">
                {orderStatus === 'placed' && t.timelineStep1}
                {orderStatus === 'preparing' && t.timelineStep2}
                {orderStatus === 'completed' && t.timelineStep3}
              </span>
            </div>

            {/* Visual Timeline Stepper */}
            <div className="mt-6 flex items-center justify-between relative">
              <div className="absolute left-1 right-1 top-[15px] h-[2px] bg-neutral-800 pointer-events-none z-0">
                <div
                  className="h-full bg-[#C5A880] transition-all duration-1000"
                  style={{
                    width: orderStatus === 'placed' ? '15%' : orderStatus === 'preparing' ? '60%' : '100%'
                  }}
                />
              </div>

              {/* Step 1: Received */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-500 ${
                  String(orderStatus) !== 'none'
                    ? 'bg-[#C5A880] text-[#0B0A09] border-[#C5A880]'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                }`}>
                  {orderStatus === 'preparing' || orderStatus === 'completed' ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                </div>
                <span className="text-[9px] font-black uppercase mt-1 tracking-wider text-neutral-400">{t.timelineStep1}</span>
              </div>

              {/* Step 2: Preparing */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-500 ${
                  orderStatus === 'preparing' || orderStatus === 'completed'
                    ? 'bg-[#C5A880] text-[#0B0A09] border-[#C5A880]'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                }`}>
                  {orderStatus === 'completed' ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                </div>
                <span className="text-[9px] font-black uppercase mt-1 tracking-wider text-neutral-400">{t.timelineStep2}</span>
              </div>

              {/* Step 3: Served */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-500 ${
                  orderStatus === 'completed'
                    ? 'bg-[#C5A880] text-[#0B0A09] border-[#C5A880]'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                }`}>
                  3
                </div>
                <span className="text-[9px] font-black uppercase mt-1 tracking-wider text-neutral-400">{t.timelineStep3}</span>
              </div>
            </div>

            {/* Secondary actions during active order */}
            <div className="mt-6 pt-4 border-t border-white/5 flex gap-2 justify-end">
              {orderStatus === 'completed' && (
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#0B0A09] font-bold text-xs hover:bg-[#E5D5C0] transition flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {t.leaveReview}
                </button>
              )}
              <button
                onClick={() => setIsBillOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#1C1917] border border-[#C5A880]/20 text-[#C5A880] font-bold text-xs hover:bg-[#2E2925] transition flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {t.requestBill}
              </button>
              <button
                onClick={resetCustomerOrder}
                className="px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 font-bold text-xs hover:bg-red-950/40 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.clear}
              </button>
            </div>
          </motion.div>
        )}

        {/* Loyalty Progress Card */}
        <div className="bg-gradient-to-tr from-[#141211] to-[#1C1917] border border-[#C5A880]/15 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#C5A880]/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A880] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">{t.eliteLoyalty}</span>
            </div>
            <span className="text-xs font-black text-[#C5A880] bg-[#C5A880]/10 border border-[#C5A880]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {locale === 'am' ? 'የወርቅ ደረጃ' : 'Gold Tier'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <h4 className="text-2xl font-black text-white">{loyaltyPoints} <span className="text-xs font-semibold text-neutral-400">{t.points}</span></h4>
            <span className="text-xs text-neutral-400">160 {t.nextFreeBrew}</span>
          </div>

          <div className="mt-3.5 w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] h-full rounded-full transition-all duration-500"
              style={{ width: `${(loyaltyPoints % 500) / 5}%` }}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-500" />
          <input
            type="text"
            placeholder={t.searchMenuPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141211] border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#C5A880]/50 text-white placeholder-neutral-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Categories Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            // Translate category name
            let label: string = cat;
            if (locale === 'am') {
              if (cat === 'Signatures') label = 'የተለዩ መጠጦች';
              else if (cat === 'Espresso & Coffee') label = 'ኤስፕሬሶ እና ቡና';
              else if (cat === 'Boulangerie & Pastry') label = 'መጋገሪያዎች';
              else if (cat === 'Signature All-Day Mains') label = 'ልዩ ምግቦች';
              else if (cat === 'Fine Teas & Matcha') label = 'ሻይ እና ማቻ';
            }
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all uppercase tracking-wider ${
                  activeCategory === cat
                    ? 'bg-[#C5A880] text-[#0B0A09] border-[#C5A880] shadow-md shadow-[#C5A880]/10'
                    : 'bg-[#141211] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Luxury Product Catalog Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-black tracking-widest text-[#C5A880]">
              {locale === 'am' ? (
                activeCategory === 'Signatures' ? 'የተለዩ መጠጦች' :
                activeCategory === 'Espresso & Coffee' ? 'ኤስፕሬሶ እና ቡና' :
                activeCategory === 'Boulangerie & Pastry' ? 'መጋገሪያዎች' :
                activeCategory === 'Signature All-Day Mains' ? 'ልዩ ምግቦች' :
                'ሻይ እና ማቻ'
              ) : activeCategory} {t.selectionTitle}
            </h3>
            <span className="text-[11px] text-neutral-500 font-medium">{filteredProducts.length} {t.availableItems}</span>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => {
              const isFavorite = favorites.includes(product.id);
              const displayName = locale === 'am' ? product.nameAm : product.name;
              const displayDesc = locale === 'am' ? product.descriptionAm : product.description;
              const displayTags = locale === 'am' ? product.tagsAm : product.tags;

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-b from-[#141211] to-[#0E0D0C] border border-neutral-800/80 hover:border-[#C5A880]/20 rounded-2xl overflow-hidden shadow-md group transition-all"
                >
                  <div className="flex h-36">
                    {/* Visual Coffee/Bakery Image Placement */}
                    <div className="w-32 relative overflow-hidden bg-neutral-900 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt={displayName}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0E0D0C]" />

                      {/* Tag indicators */}
                      {displayTags.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          {displayTags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-[#0B0A09]/80 backdrop-blur-md rounded-full text-[8px] font-black uppercase text-[#C5A880] tracking-wider border border-[#C5A880]/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product Details Area */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-[#C5A880] transition-colors line-clamp-1">
                            {displayName}
                          </h4>
                          <button
                            onClick={() => toggleFavorite(product.id)}
                            className="p-1 rounded-full text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition"
                          >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {displayDesc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-sm font-black text-white">
                          {formatCurrency(product.price)}
                        </span>

                        <button
                          onClick={() => handleOpenCustomize(product)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 hover:bg-[#C5A880] hover:text-[#0B0A09] text-[11px] font-black uppercase tracking-wider text-[#C5A880] transition-all"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>{t.customize}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 bg-[#141211] rounded-2xl border border-neutral-800">
              <p className="text-neutral-500 text-sm">{locale === 'am' ? 'ምንም አይነት ምርት አልተገኘም።' : 'No items found matching your filter/search.'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Bottom Bar with Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-4 bg-gradient-to-t from-[#0B0A09] via-[#0B0A09]/95 to-transparent">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] px-6 flex items-center justify-between shadow-lg shadow-[#C5A880]/15 hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0B0A09] flex items-center justify-center text-white text-xs font-black">
                  {cart.reduce((qty, item) => qty + item.quantity, 0)}
                </div>
                <span className="text-sm font-extrabold uppercase tracking-widest">{t.viewBag}</span>
              </div>
              <div className="flex items-center gap-2 font-black text-sm">
                <span>{formatCurrency(getCartTotal())}</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 1. CUSTOMIZATION DIALOG / MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B0A09]/80 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#12100F] border-t border-[#C5A880]/20 rounded-t-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#12100F] px-5 py-4 border-b border-white/5 flex items-center justify-between z-10">
                <h3 className="text-md font-extrabold uppercase text-white tracking-wider">{t.customizeOrder}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Product Header details */}
                <div className="flex gap-4 pb-4 border-b border-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedProduct.image} alt={locale === 'am' ? selectedProduct.nameAm : selectedProduct.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div>
                    <h4 className="text-md font-bold text-white">{locale === 'am' ? selectedProduct.nameAm : selectedProduct.name}</h4>
                    <p className="text-xs text-neutral-400 mt-1">{locale === 'am' ? selectedProduct.descriptionAm : selectedProduct.description}</p>
                    <p className="text-[#C5A880] text-sm font-black mt-1.5">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                </div>

                {/* Size Selector (If Beverage) */}
                {!selectedProduct.category.includes('Pastry') && !selectedProduct.category.includes('Mains') && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t.selectSize}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Standard', 'Grande', 'Venti'] as const).map((sz) => {
                        const labelText = locale === 'am' ? (
                          sz === 'Standard' ? 'መደበኛ' : sz === 'Grande' ? 'ትልቅ' : 'በጣም ትልቅ'
                        ) : sz;
                        const surcharge = sz === 'Grande' ? (locale === 'am' ? '+35 ብር' : '+$0.50') : sz === 'Venti' ? (locale === 'am' ? '+70 ብር' : '+$1.00') : (locale === 'am' ? 'መሰረታዊ' : 'Base');
                        return (
                          <button
                            key={sz}
                            onClick={() => setCustomSize(sz)}
                            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                              customSize === sz
                                ? 'bg-[#C5A880]/10 border-[#C5A880] text-[#C5A880]'
                                : 'bg-neutral-950/50 border-neutral-800 text-neutral-400'
                            }`}
                          >
                            <span>{labelText}</span>
                            <span className="text-[10px] opacity-75 font-normal">{surcharge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Milk Selector (If Beverage) */}
                {!selectedProduct.category.includes('Pastry') && !selectedProduct.category.includes('Mains') && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t.milkOptions}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        'Whole Milk',
                        'Oat Milk (+ $0.50)',
                        'Almond Milk (+ $0.50)',
                        'None'
                      ] as const).map((mk) => {
                        let labelText = mk.split(' (+')[0];
                        if (locale === 'am') {
                          if (mk === 'Whole Milk') labelText = 'መደበኛ ወተት';
                          else if (mk.includes('Oat Milk')) labelText = 'የኦት ወተት';
                          else if (mk.includes('Almond Milk')) labelText = 'የለውዝ ወተት';
                          else labelText = 'ያለ ወተት';
                        }
                        const costText = mk.includes('+$0.50') || mk.includes('+ $0.50') ? (locale === 'am' ? '+35 ብር' : '+$0.50') : '';
                        return (
                          <button
                            key={mk}
                            onClick={() => setCustomMilk(mk)}
                            className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                              customMilk === mk
                                  ? 'bg-[#C5A880]/10 border-[#C5A880] text-[#C5A880]'
                                  : 'bg-neutral-950/50 border-neutral-800 text-neutral-400'
                            }`}
                          >
                            <span>{labelText}</span>
                            {costText && <span className="text-[10px] text-[#C5A880]">{costText}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Toppings / Add-ons Selector */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t.premiumAddons}</label>
                  <div className="space-y-2">
                    {[
                      'Extra Double Shot Ristretto (+$1.00)',
                      'Salted Pistachio Cream Cold Foam (+$1.50)',
                      'Organic Honey/Agave Drizzle (+$0.50)',
                      'Eton Vanilla Bean Whipped Cream (+$0.50)'
                    ].map((top) => {
                      const isSelected = selectedToppings.includes(top);
                      let labelText = top.split(' (')[0];
                      if (locale === 'am') {
                        if (top.includes('Ristretto')) labelText = 'ተጨማሪ ድርብ ሪስትሬቶ';
                        else if (top.includes('Pistachio')) labelText = 'የፒስታቺዮ ኮልድ ፎም';
                        else if (top.includes('Honey')) labelText = 'ኦርጋኒክ ማር/አጋቬ';
                        else labelText = 'የቫኒላ ዊፕድ ክሬም';
                      }
                      const costText = top.includes('+$1.00') ? (locale === 'am' ? '+70 ብር' : '+$1.00') :
                                       top.includes('+$1.50') ? (locale === 'am' ? '+100 ብር' : '+$1.50') :
                                       (locale === 'am' ? '+35 ብር' : '+$0.50');
                      return (
                        <button
                          key={top}
                          onClick={() => {
                            setSelectedToppings(prev =>
                              prev.includes(top) ? prev.filter(t => t !== top) : [...prev, top]
                            );
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#C5A880]/10 border-[#C5A880] text-[#C5A880]'
                              : 'bg-neutral-950/50 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <span>{labelText}</span>
                          <span className="text-xs text-[#C5A880] font-black">{costText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Special Instructions Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t.specialRequests}</label>
                  <textarea
                    placeholder={t.specialRequestsPlaceholder}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 text-xs focus:outline-none focus:border-[#C5A880]/50 text-white placeholder-neutral-600 resize-none"
                  />
                </div>

                {/* Quantity & Customize Pricing Add Button */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl">
                    <button
                      onClick={() => setCustomQuantity(prev => Math.max(1, prev - 1))}
                      className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black w-4 text-center">{customQuantity}</span>
                    <button
                      onClick={() => setCustomQuantity(prev => prev + 1)}
                      className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] text-xs font-extrabold uppercase tracking-widest flex items-center justify-between px-5 shadow-lg shadow-[#C5A880]/15"
                  >
                    <span>{t.addBag}</span>
                    <span>{formatCurrency(getCustomizedTotalPrice(selectedProduct.price))}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DINE-IN SHOPPING BAG / CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B0A09]/80 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#12100F] border-t border-[#C5A880]/20 rounded-t-3xl max-h-[85vh] flex flex-col"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#C5A880]" />
                  <h3 className="text-md font-extrabold uppercase tracking-wider text-white">{locale === 'am' ? 'የመረጧቸው ምርቶች ከረጢት' : 'Your Selection Bag'}</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart List Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.map((item) => {
                  const menuItem = MENU_ITEMS.find(m => m.id === item.productId);
                  const displayName = locale === 'am' && menuItem ? menuItem.nameAm : item.name;

                  let sizeText: string = item.customizations.size;
                  if (locale === 'am') {
                    if (item.customizations.size === 'Standard') sizeText = 'መደበኛ';
                    else if (item.customizations.size === 'Grande') sizeText = 'ትልቅ';
                    else if (item.customizations.size === 'Venti') sizeText = 'በጣም ትልቅ';
                  }

                  let milkText = item.customizations.milk.split(' (+')[0];
                  if (locale === 'am') {
                    if (item.customizations.milk === 'Whole Milk') milkText = 'መደበኛ ወተት';
                    else if (item.customizations.milk.includes('Oat Milk')) milkText = 'የኦት ወተት';
                    else if (item.customizations.milk.includes('Almond Milk')) milkText = 'የለውዝ ወተት';
                    else milkText = 'ያለ ወተት';
                  }

                  return (
                    <div key={item.id} className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 flex gap-3 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={displayName} className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-neutral-500 hover:text-red-400 p-0.5 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Display Customizations brief */}
                        <p className="text-[10px] text-[#C5A880] mt-0.5 font-bold">
                          {sizeText} • {milkText}
                          {item.customizations.toppings.length > 0 && ` • +${item.customizations.toppings.length} ${locale === 'am' ? 'ተጨማሪ(ዎች)' : 'Add-on(s)'}`}
                        </p>

                        {item.customizations.notes && (
                          <p className="text-[10px] text-neutral-500 italic mt-1 truncate">
                            &quot;{item.customizations.notes}&quot;
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs font-black text-white">{formatCurrency(item.price * item.quantity)}</span>

                          <div className="flex items-center gap-2.5 bg-neutral-900 px-2.5 py-1 rounded-lg">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="p-0.5 rounded text-neutral-400 hover:text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black min-w-3 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="p-0.5 rounded text-neutral-400 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total pricing breakups and checkout actions */}
              <div className="bg-neutral-950 border-t border-white/5 p-5 space-y-4">
                <div className="space-y-1.5 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>{t.subtotal}</span>
                    <span className="text-white font-semibold">{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.processingFee}</span>
                    <span className="text-white font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm">
                    <span className="text-[#C5A880] font-bold">{t.totalPrice}</span>
                    <span className="text-[#C5A880] font-black">{formatCurrency(getCartTotal())}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    placeOrder();
                    setIsCartOpen(false);
                  }}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#C5A880]/10"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{t.placeInstantOrder}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DINE-IN SERVICE DRAWER (Call Waiter / Service assistance) */}
      <AnimatePresence>
        {isServiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A09]/80 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#12100F] border border-[#C5A880]/20 rounded-2xl p-6 relative"
            >
              <button
                onClick={() => setIsServiceOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <Bell className="w-6 h-6 animate-swing" />
                </div>

                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">{t.waiterService}</h3>
                  <p className="text-xs text-neutral-400 mt-1">{locale === 'am' ? 'ንጹህ ማንኪያ፣ ውሃ ወይም ተጨማሪ ነገር ይፈልጋሉ? አስተናጋጁን እዚህ ይጥሩ።' : 'Need water, clean cutlery, or custom requests? Notify the bar instantly.'}</p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <button
                    onClick={() => {
                      callWaiter();
                      setIsServiceOpen(false);
                    }}
                    disabled={waiterCalled}
                    className="w-full py-3 rounded-xl bg-[#C5A880] text-[#0B0A09] text-xs font-black uppercase tracking-wider transition hover:bg-[#E5D5C0] disabled:opacity-50"
                  >
                    {waiterCalled ? t.waiterSummoned : t.waiterSummonsBtn}
                  </button>

                  <button
                    onClick={() => {
                      setIsServiceOpen(false);
                      setIsBillOpen(true);
                    }}
                    className="w-full py-3 rounded-xl bg-neutral-950 border border-[#C5A880]/20 text-[#C5A880] text-xs font-black uppercase tracking-wider transition hover:bg-neutral-900"
                  >
                    {t.billPaymentBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. BILL PAYMENT / REQUEST DRAWER */}
      <AnimatePresence>
        {isBillOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A09]/80 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#12100F] border border-[#C5A880]/20 rounded-2xl p-6 relative animate-fadeIn"
            >
              <button
                onClick={() => setIsBillOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <CreditCard className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">{t.requestDineInBill}</h3>
                  <p className="text-xs text-neutral-400 mt-1">{t.readyToConclude}</p>
                </div>

                <div className="w-full border border-neutral-800 rounded-xl p-3 text-left space-y-1.5 bg-neutral-950/50">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">{t.billBreakdowns}</span>
                  <div className="flex justify-between text-xs">
                    <span>{t.completedOrders}</span>
                    <span className="font-semibold text-white">{formatCurrency(getActiveOrderTotal() > 0 ? getActiveOrderTotal() : 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>{t.tax}</span>
                    <span className="font-semibold text-white">{formatCurrency((getActiveOrderTotal() > 0 ? getActiveOrderTotal() : 0) * 0.15)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-white/5 font-bold text-[#C5A880]">
                    <span>{t.grandTotal}</span>
                    <span>{formatCurrency((getActiveOrderTotal() > 0 ? getActiveOrderTotal() : 0) * 1.15)}</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      requestBill('card');
                      setIsBillOpen(false);
                    }}
                    className="py-3 rounded-xl bg-[#C5A880] text-[#0B0A09] text-xs font-black uppercase tracking-wider transition hover:bg-[#E5D5C0] flex flex-col items-center gap-1"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{t.payCard}</span>
                  </button>
                  <button
                    onClick={() => {
                      requestBill('cash');
                      setIsBillOpen(false);
                    }}
                    className="py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-black uppercase tracking-wider transition hover:bg-neutral-900 flex flex-col items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C5A880]" />
                    <span>{t.payCash}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DINE-IN SERVICE FEEDBACK MODAL */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A09]/80 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#12100F] border border-[#C5A880]/20 rounded-2xl p-6 relative"
            >
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <MessageSquare className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">{t.shareExperience}</h3>
                  <p className="text-xs text-neutral-400 mt-1">{t.helpFineTune}</p>
                </div>

                {/* Rating selection stars */}
                <div className="flex items-center gap-1.5 pt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingInput(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition"
                    >
                      <Star className={`w-6 h-6 ${star <= ratingInput ? 'fill-amber-500' : 'text-neutral-600'}`} />
                    </button>
                  ))}
                </div>

                {/* Feedback comment input */}
                <textarea
                  placeholder={locale === 'am' ? 'ስለ ቡናው ጣዕም፣ ባሪስታ አገልግሎት፣ ወይም ምቾት አስተያየትዎን እዚህ ያጋሩን...' : 'Share any thoughts on drink taste, barista service, or menu speed...'}
                  value={feedbackCommentInput}
                  onChange={(e) => setFeedbackCommentInput(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus:outline-none focus:border-[#C5A880]/50 text-white placeholder-neutral-600 resize-none"
                />

                <button
                  onClick={() => {
                    submitFeedback(ratingInput, feedbackCommentInput);
                    setIsFeedbackOpen(false);
                    setFeedbackCommentInput('');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E5D5C0] text-[#0B0A09] text-xs font-black uppercase tracking-wider transition"
                >
                  {t.submitReview}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PremiumMenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0A09] text-[#F5F4F0] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#C5A880] animate-spin" />
        <span className="text-xs text-[#C5A880] font-bold uppercase tracking-widest">Loading Premium Menu...</span>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
