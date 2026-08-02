import { create } from 'zustand';

export interface KitchenItem {
  id: string;
  orderNumber: string;
  item: string;
  timeElapsed: string; // e.g. "3m ago", "12m ago"
  status: 'pending' | 'preparing' | 'completed';
  type: 'Beverage' | 'Food' | 'Pastry';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'alert' | 'order' | 'system' | 'insight';
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  customizations: {
    size: 'Standard' | 'Grande' | 'Venti';
    milk: 'Whole Milk' | 'Oat Milk (+ $0.50)' | 'Almond Milk (+ $0.50)' | 'None';
    toppings: string[];
    notes: string;
  };
}

import { LocaleType } from '../data/translations';

interface AppState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  searchQuery: string;
  activeWorkspace: string;
  notificationOpen: boolean;
  kitchenQueue: KitchenItem[];
  notifications: NotificationItem[];
  quickActionsLog: string[];

  // Ethiopian Localization State
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  formatCurrency: (amount: number) => string;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setSearchQuery: (query: string) => void;
  setActiveWorkspace: (workspace: string) => void;
  toggleNotification: () => void;
  setNotificationOpen: (open: boolean) => void;

  completeKitchenItem: (id: string) => void;
  preparingKitchenItem: (id: string) => void;
  addKitchenItem: (item: Omit<KitchenItem, 'id' | 'status' | 'timeElapsed'>) => void;

  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'unread'>) => void;
  addQuickActionLog: (log: string) => void;

  // Customer Experience States
  tableNumber: string;
  cart: CartItem[];
  favorites: string[];
  orderStatus: 'none' | 'placed' | 'preparing' | 'completed';
  waiterCalled: boolean;
  billRequested: 'none' | 'cash' | 'card';
  feedbackRating: number;
  feedbackComment: string;
  loyaltyPoints: number;
  activeOrderItems: CartItem[];

  setTableNumber: (table: string) => void;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, qty: number) => void;
  toggleFavorite: (productId: string) => void;
  placeOrder: () => void;
  callWaiter: () => void;
  requestBill: (method: 'cash' | 'card') => void;
  submitFeedback: (rating: number, comment: string) => void;
  resetCustomerOrder: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  theme: 'dark',
  searchQuery: '',
  activeWorkspace: 'Robusta Coffee (Flagship)',
  notificationOpen: false,
  quickActionsLog: ['Vendor OS booted.', 'Robusta Coffee Workspace loaded.'],

  // Ethiopian default settings (en-ET, ETB)
  locale: 'en',
  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vendor_preferred_locale', locale);
    }
    set({ locale });
  },

  formatCurrency: (amount) => {
    // Elegant Ethiopian Birr formatting: e.g. 42,500 ብር or ETB 42,500
    const formattedNum = new Intl.NumberFormat('en-ET', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

    const { locale } = get();
    return locale === 'am' ? `${formattedNum} ብር` : `ETB ${formattedNum}`;
  },

  kitchenQueue: [
    { id: 'k1', orderNumber: '#1042', item: '2x Double Espresso Macchiato (Oat)', timeElapsed: '2m ago', status: 'preparing', type: 'Beverage' },
    { id: 'k2', orderNumber: '#1043', item: '1x Pistachio Croissant, 1x Iced Spanish Latte', timeElapsed: '5m ago', status: 'preparing', type: 'Pastry' },
    { id: 'k3', orderNumber: '#1044', item: '1x Avocado Sourdough Toast', timeElapsed: '8m ago', status: 'pending', type: 'Food' },
    { id: 'k4', orderNumber: '#1045', item: '1x Vendor Signature Nitro Cold Brew', timeElapsed: '11m ago', status: 'pending', type: 'Beverage' },
    { id: 'k5', orderNumber: '#1046', item: '2x Pain au Chocolat', timeElapsed: '15m ago', status: 'pending', type: 'Pastry' },
  ],

  notifications: [
    { id: 'n1', title: 'Critical Stock Alert', description: 'Single Origin Ethiopia Yirgacheffe beans below 5kg threshold (4.2kg left).', time: '10m ago', unread: true, type: 'alert' },
    { id: 'n2', title: 'New VIP Guest Check-In', description: 'Mr. Harrison (Platinum Tier) just ordered via Mobile App (Table 4).', time: '15m ago', unread: true, type: 'insight' },
    { id: 'n3', title: 'High Ticket Order', description: 'New catering order #1039 placed: $342.50.', time: '1h ago', unread: false, type: 'order' },
    { id: 'n4', title: 'AI Automation Active', description: 'Vendor AI auto-scheduled a restock draft order for Arabica Blend.', time: '2h ago', unread: false, type: 'system' },
  ],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('vendor_theme', nextTheme);
    }
    return { theme: nextTheme };
  }),
  setTheme: (theme) => set(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('vendor_theme', theme);
    }
    return { theme };
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveWorkspace: (workspace) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vendor_active_workspace', workspace);
    }
    set({ activeWorkspace: workspace });
  },
  toggleNotification: () => set((state) => ({ notificationOpen: !state.notificationOpen })),
  setNotificationOpen: (open) => set({ notificationOpen: open }),

  completeKitchenItem: (id) => set((state) => ({
    kitchenQueue: state.kitchenQueue.filter(item => item.id !== id),
    quickActionsLog: [`Order item completed/cleared from KDS queue.`, ...state.quickActionsLog]
  })),

  preparingKitchenItem: (id) => set((state) => ({
    kitchenQueue: state.kitchenQueue.map(item =>
      item.id === id ? { ...item, status: 'preparing' } : item
    )
  })),

  addKitchenItem: (item) => set((state) => {
    const newItem: KitchenItem = {
      ...item,
      id: `k-${Date.now()}`,
      status: 'pending',
      timeElapsed: 'Just now'
    };
    return {
      kitchenQueue: [newItem, ...state.kitchenQueue]
    };
  }),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, unread: false }))
  })),

  addNotification: (notification) => set((state) => {
    const newNotif: NotificationItem = {
      ...notification,
      id: `n-${Date.now()}`,
      time: 'Just now',
      unread: true
    };
    return {
      notifications: [newNotif, ...state.notifications]
    };
  }),

  addQuickActionLog: (log) => set((state) => ({
    quickActionsLog: [log, ...state.quickActionsLog]
  })),

  // Customer Experience State Implementations
  tableNumber: 'Table 5',
  cart: [],
  favorites: [],
  orderStatus: 'none',
  waiterCalled: false,
  billRequested: 'none',
  feedbackRating: 0,
  feedbackComment: '',
  loyaltyPoints: 340, // Base starting points for Robusta rewards
  activeOrderItems: [],

  setTableNumber: (table) => set({ tableNumber: table }),

  addToCart: (item) => set((state) => {
    // If exact same customization exists, increment quantity, otherwise add new
    const existingIndex = state.cart.findIndex(
      (c) =>
        c.productId === item.productId &&
        c.customizations.size === item.customizations.size &&
        c.customizations.milk === item.customizations.milk &&
        JSON.stringify(c.customizations.toppings) === JSON.stringify(item.customizations.toppings) &&
        c.customizations.notes === item.customizations.notes
    );

    if (existingIndex > -1) {
      const newCart = [...state.cart];
      newCart[existingIndex].quantity += item.quantity;
      return { cart: newCart };
    }

    const newItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    return { cart: [...state.cart, newItem] };
  }),

  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter((item) => item.id !== id),
  })),

  updateCartQuantity: (id, qty) => set((state) => ({
    cart: state.cart.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item)),
  })),

  toggleFavorite: (productId) => set((state) => {
    const isFav = state.favorites.includes(productId);
    const newFavs = isFav
      ? state.favorites.filter((id) => id !== productId)
      : [...state.favorites, productId];
    return { favorites: newFavs };
  }),

  placeOrder: () => {
    const { cart, tableNumber, addKitchenItem, addNotification, addQuickActionLog, loyaltyPoints } = get();
    if (cart.length === 0) return;

    // Generate summary string of order items for kitchen KDS
    const orderItemsSummary = cart
      .map((item) => `${item.quantity}x ${item.name} (${item.customizations.size})`)
      .join(', ');

    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    // Add to kitchen queue (operating cockpit)
    addKitchenItem({
      orderNumber,
      item: orderItemsSummary,
      type: 'Beverage', // default type, can categorize
    });

    // Create system notification for operating cockpit
    addNotification({
      title: `Instant Table Order ${orderNumber}`,
      description: `New order from ${tableNumber}: ${orderItemsSummary}`,
      type: 'order',
    });

    addQuickActionLog(`Order ${orderNumber} placed by ${tableNumber} for ${cart.length} item(s).`);

    // Calculate loyalty points earned (e.g., 10 points per dollar spent)
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const earnedPoints = Math.round(subtotal * 10);

    set({
      activeOrderItems: cart,
      cart: [],
      orderStatus: 'placed',
      loyaltyPoints: loyaltyPoints + earnedPoints,
    });

    // Simulate order state updates over time (placed -> preparing after 8 seconds -> completed/served after 20 seconds)
    setTimeout(() => {
      if (get().orderStatus === 'placed') {
        set({ orderStatus: 'preparing' });
        addQuickActionLog(`Order ${orderNumber} is now being prepared by the barista.`);
        addNotification({
          title: `Preparing Order ${orderNumber}`,
          description: `${tableNumber} order is now under preparation.`,
          type: 'system',
        });
      }
    }, 8000);

    setTimeout(() => {
      if (get().orderStatus === 'preparing') {
        set({ orderStatus: 'completed' });
        addQuickActionLog(`Order ${orderNumber} for ${tableNumber} has been served.`);
        addNotification({
          title: `Served Order ${orderNumber}`,
          description: `${tableNumber} has been successfully served.`,
          type: 'insight',
        });
      }
    }, 20000);
  },

  callWaiter: () => {
    const { tableNumber, addNotification, addQuickActionLog } = get();
    set({ waiterCalled: true });

    // Add critical notification to dashboard
    addNotification({
      title: `Waiter Service Request`,
      description: `${tableNumber} is requesting immediate waiter assistance.`,
      type: 'alert',
    });

    addQuickActionLog(`Waiter requested at ${tableNumber}.`);
  },

  requestBill: (method) => {
    const { tableNumber, addNotification, addQuickActionLog } = get();
    set({ billRequested: method });

    // Add order notification to dashboard
    addNotification({
      title: `Bill Request: ${method.toUpperCase()}`,
      description: `${tableNumber} requested their final bill payment via ${method.toUpperCase()}.`,
      type: 'order',
    });

    addQuickActionLog(`Bill request (${method}) received from ${tableNumber}.`);
  },

  submitFeedback: (rating, comment) => {
    const { tableNumber, addNotification, addQuickActionLog } = get();
    set({ feedbackRating: rating, feedbackComment: comment });

    addNotification({
      title: `Customer Feedback: ${rating} Stars`,
      description: `${tableNumber} shared feedback: "${comment || 'No comment left'}"`,
      type: 'insight',
    });

    addQuickActionLog(`Feedback rating of ${rating}/5 received from ${tableNumber}.`);
  },

  resetCustomerOrder: () => set({
    activeOrderItems: [],
    orderStatus: 'none',
    waiterCalled: false,
    billRequested: 'none',
    feedbackRating: 0,
    feedbackComment: '',
  }),
}));
