# Implementation Plan: Vador OS — Production-Ready Restaurant Operating System

## Overview

This plan transforms the existing Vador OS foundation into a production-grade, enterprise Restaurant Operating System. All tasks preserve and enhance existing code — no rewrites. New code is organized in `src/features/{feature}/` with shared primitives in `src/components/ui/`. Every API route uses the `{ data, error, meta }` envelope, all new tables include the standard audit columns, and all 39 correctness properties defined in the design doc are covered by fast-check property-based tests.

**Implementation language**: TypeScript (Next.js 15 App Router, existing codebase language)

---

## Tasks

### Phase 1 — Foundation

- [x] 1. Design System Tokens & Global CSS
  - [x] 1.1 Extend `src/app/globals.css` with typography scale, extended semantic color tokens, spacing/layout variables, and new utility classes
    - Add CSS custom properties: `--font-sans`, `--font-mono`, `--text-xs` through `--text-4xl`, `--font-normal` through `--font-black`, `--leading-*` variants
    - Add extended semantic tokens for `:root` and `.dark`: `--success`, `--warning`, `--info`, `--gold`, `--gold-muted`, `--orange-accent`
    - Add layout tokens: `--sidebar-width-open: 280px`, `--sidebar-width-closed: 76px`, `--navbar-height: 64px`, `--content-max-width: 1440px`
    - Add utility classes: `.skeleton` (shimmer animation), `.metric-value` (count-up transition), `.focus-ring` (WCAG AA focus indicator)
    - Verify WCAG AA contrast for all text/background combos in both light and dark themes
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

- [ ] 2. Shared UI Primitives (`src/components/ui/`)
  - [-] 2.1 Create base interactive primitives: `Button.tsx`, `Input.tsx`, `Select.tsx`, `Badge.tsx`, `Avatar.tsx`, `Tooltip.tsx`
    - Each component: typed props, Tailwind-based variants, full keyboard support, ARIA attributes
    - `Button`: variants (primary, secondary, ghost, destructive), sizes (sm, md, lg), loading state
    - `Input`: label, error, helper text, left/right icon slots, controlled
    - _Requirements: 1.5, 21.1, 21.2, 21.3, 21.6_
  - [-] 2.2 Create overlay primitives: `Modal.tsx`, `Drawer.tsx`, `Sheet.tsx`, `DropdownMenu.tsx`
    - Focus trap + restore, spring animations (damping: 25, stiffness: 200), `aria-modal`, `role="dialog"`
    - _Requirements: 21.5, 22.3_
  - [-] 2.3 Create data display primitives: `DataTable.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `Pagination.tsx`, `Tabs.tsx`
    - `DataTable`: virtualised at 100+ rows, sortable columns, row selection, pagination
    - `Skeleton`: shimmer block with configurable dimensions
    - `EmptyState`: icon + heading + body + CTA slot
    - _Requirements: 2.2, 2.3, 20.6_
  - [-] 2.4 Create advanced primitives: `Toast.tsx`, `ErrorBoundary.tsx`, `CommandPalette.tsx`, `Kanban.tsx`, `DatePicker.tsx`, `FileUpload.tsx`
    - `CommandPalette`: `role="listbox"`, `aria-activedescendant`, Arrow/Enter/Escape keyboard nav
    - `Kanban`: wraps `@dnd-kit/core` + `@dnd-kit/sortable` column + card containers
    - `FileUpload`: drag-and-drop, type/size validation, upload progress preview
    - _Requirements: 14.5, 22.3, 4.6, 4.8_

- [x] 3. API Response Utilities (`src/lib/response.ts`)
  - [x] 3.1 Create `src/lib/response.ts` with `apiResponse<T>()` and `apiError()` factory functions
    - Implement `ApiMeta` interface: `{ total?, page?, pageSize?, [key]: unknown }`
    - Implement `apiResponse<T>(data, error, meta, status)` returning `Response.json({ data, error, meta }, { status })`
    - Implement `apiError(message, status)` returning `{ data: null, error: message, meta: {} }`
    - _Requirements: 18.1_
  - [x] 3.2 Add `parsePaginationParams(url: URL)` and Zod validation helper `validateBody<T>()` to `src/lib/api.ts`
    - `parsePaginationParams`: extracts `page`, `pageSize` (max 100), `sortBy`, `sortDir`, computes `from`/`to` offsets
    - `validateBody<T>`: wraps `schema.safeParse(body)`, returns 422 with `meta.fields` on failure
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [ ] 4. Database Schema Extensions
  - [x] 4.1 Create SQL migration `supabase_migrations/001_enums.sql` with all new enum types
    - `fulfillment_type`, `payment_method`, `priority_label`, `kds_status`, `purchase_status`
    - `shift_status`, `reservation_status`, `loyalty_tier`, `coupon_type`, `transfer_status`
    - _Requirements: 19.1_
  - [-] 4.2 Create SQL migration `supabase_migrations/002_locations_menu.sql`
    - Tables: `locations`, `menu_categories`, `menu_items`, `menu_variants`, `menu_modifiers`
    - All tables include `id UUID PK`, `tenant_slug FK`, `created_at`, `updated_at`, `deleted_at`
    - All indexes on FK columns, status columns, and `created_at`
    - RLS policies using `request.jwt.claims.tenant_slug` pattern
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  - [~] 4.3 Create SQL migration `supabase_migrations/003_suppliers_staff.sql`
    - Tables: `suppliers`, `purchase_orders`, `purchase_order_items`, `employees`, `shifts`, `attendance_logs`
    - All FK constraints, cascade rules, CHECK constraints (e.g. `end_at > start_at`)
    - RLS policies on all new tables
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  - [~] 4.4 Create SQL migration `supabase_migrations/004_customers_reservations.sql`
    - Tables: `customers`, `loyalty_points`, `coupons`, `reservations`, `waitlist_entries`
    - UNIQUE constraint on `(tenant_slug, code)` for coupons
    - Indexes on `reserved_at`, `status`, `table_id` for reservations
    - RLS policies on all new tables
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  - [~] 4.5 Create SQL migration `supabase_migrations/005_inventory_extensions.sql`
    - Tables: `recipe_items`, `inventory_history`
    - Extend existing `orders` table: add `location_id`, `fulfillment_type`, `payment_method`, `kds_status`, `priority`, `discount_amount`, `tax_amount`, `delivery_address`, `updated_at`, `deleted_at`
    - Extend existing `inventory_items`: add `location_id`, `supplier_id`, `cost_price`, `expiry_date`, `barcode`, `created_at`, `deleted_at`
    - New indexes: `orders_kds_status_idx`, `orders_location_id_idx`, `inventory_items_location_id_idx`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  - [~] 4.6 Create SQL migration `supabase_migrations/006_settings_api_keys.sql`
    - Add `settings` JSONB column to `tenants` table
    - Create `api_keys` table: `id`, `tenant_slug`, `key_hash TEXT`, `scope TEXT[]`, `last_used_at`, `revoked_at`, `created_at`
    - RLS policies on `api_keys`
    - _Requirements: 15.5, 19.1, 19.6_

- [ ] 5. TypeScript Type Extensions
  - [x] 5.1 Extend `src/lib/database.types.ts` with Row/Insert/Update types for all new tables
    - Add all new enum types to `Database['public']['Enums']`
    - Add Row/Insert/Update types for: `locations`, `menu_categories`, `menu_items`, `menu_variants`, `menu_modifiers`
    - Add Row/Insert/Update types for: `suppliers`, `purchase_orders`, `purchase_order_items`, `employees`, `shifts`, `attendance_logs`
    - _Requirements: 19.1_
  - [~] 5.2 Continue extending `src/lib/database.types.ts` for remaining tables and updated existing table types
    - Add Row/Insert/Update types for: `customers`, `loyalty_points`, `coupons`, `reservations`, `waitlist_entries`
    - Add Row/Insert/Update types for: `recipe_items`, `inventory_history`, `api_keys`
    - Update `OrderRow` and `InventoryItemRow` types to include newly added columns
    - _Requirements: 19.1_

- [~] 6. Checkpoint — Phase 1 complete
  - Ensure all migrations are valid SQL, TypeScript types compile without errors, and response utilities export correctly. Ask the user if any questions arise.

---

### Phase 2 — Auth & Core Infrastructure

- [ ] 7. Authentication Enhancement
  - [~] 7.1 Extend `src/lib/auth.ts` with RBAC helpers and `requireRole(minRole)` function
    - Add `UserRole` type and `ROLE_HIERARCHY` map: `admin:6, manager:5, cashier:4, kitchen:3, waiter:2, customer:1`
    - Implement `requireRole(minRole)`: queries `profiles.role`, compares hierarchy rank, throws `apiError('Forbidden', 403)` if insufficient
    - Implement `requireAuth()`: throws `apiError('Unauthorized', 401)` if no session
    - _Requirements: 17.3, 17.4, 17.5_
  - [~] 7.2 Extend `middleware.ts` with session refresh, tenant slug resolution, CSRF, and rate limiting
    - Refresh Supabase session on every request using `createMiddlewareClient`
    - Extract `tenant_slug` from hostname via `getTenantIdFromHost()`, set `x-tenant-slug` header
    - Return 401 redirect/response for unauthenticated requests to protected routes
    - Implement sliding-window rate limiter (100 req/min per IP), return 429 with `Retry-After` header
    - Validate `X-Requested-With` header on POST/PATCH/DELETE routes for CSRF protection
    - _Requirements: 17.4, 17.6, 17.8, 17.10_
  - [~] 7.3 Create login page at `src/app/login/page.tsx` with Email/Password, Google OAuth, and Magic Link sign-in
    - Email/Password form: Zod validation, `supabase.auth.signInWithPassword()`
    - Google OAuth button: `supabase.auth.signInWithOAuth({ provider: 'google' })`
    - Magic Link form: `supabase.auth.signInWithOtp({ email })`
    - Write audit log entry on successful sign-in
    - _Requirements: 17.1, 17.7_
  - [~] 7.4 Create 2FA TOTP setup and verification flow for admin/manager roles
    - TOTP enrollment page: `supabase.auth.mfa.enroll({ factorType: 'totp' })`, render QR code
    - Verification step: `supabase.auth.mfa.challenge()` + `supabase.auth.mfa.verify()`
    - Middleware checks `session.user.factors` before granting admin/manager access
    - _Requirements: 17.2_

- [ ] 8. Multi-location Support
  - [~] 8.1 Create `src/app/api/locations/route.ts` and `src/app/api/locations/[id]/route.ts`
    - GET: list locations for tenant, support `?isActive=true` filter, use `apiResponse` envelope
    - POST: create location, require `admin` role, write audit log
    - PATCH: update location, require `admin` role, write audit log
    - _Requirements: 16.1, 18.1_
  - [~] 8.2 Create Zustand `locationSlice` in `src/features/locations/store/locationSlice.ts` and merge into `src/store/useStore.ts`
    - State: `activeLocationId: string | null`, `locations: LocationRow[]`
    - Actions: `setActiveLocation(id)`, `setLocations(locations)`
    - Persist `activeLocationId` to `localStorage` via Zustand `persist` middleware
    - _Requirements: 16.2_
  - [~] 8.3 Update `src/components/Sidebar.tsx` to render a location switcher dropdown
    - Replace existing workspace dropdown with `LocationSwitcher` component
    - On selection, call `setActiveLocation(id)`, triggering React Query refetch for all location-scoped keys
    - _Requirements: 16.2_

- [ ] 9. Real-time Infrastructure
  - [~] 9.1 Create `src/lib/realtime.ts` with typed Supabase channel helpers
    - Implement `subscribeToOrders(tenantSlug, onInsert)` — channel `orders:{tenantSlug}`, INSERT + UPDATE events
    - Implement `subscribeToNotifications(tenantSlug, onInsert)` — channel `notifications:{tenantSlug}`, INSERT events
    - Implement `subscribeToInventory(tenantSlug, onUpdate)` — channel `inventory:{tenantSlug}`, UPDATE events
    - Implement `subscribeToOrderTracking(orderId, onUpdate)` — channel `order_tracking:{orderId}`, UPDATE events
    - Each function returns the channel for cleanup
    - _Requirements: 5.2, 13.5, 10.8_
  - [~] 9.2 Create React hooks `useRealtimeOrders`, `useRealtimeNotifications`, `useRealtimeInventory` in `src/lib/realtime.ts`
    - Each hook: `useEffect` that creates channel, calls `queryClient.invalidateQueries` on event, returns cleanup
    - _Requirements: 5.2, 13.5_

- [ ] 10. Offline Queue
  - [~] 10.1 Create `src/lib/offline-queue.ts` using `idb-keyval` for IndexedDB persistence
    - Define `QueuedOrder` interface: `{ id: string; payload: CreateOrderPayload; createdAt: number }`
    - Implement `enqueueOrder(payload)`: writes to IndexedDB store `pos-offline-queue`
    - Implement `dequeueAll()`: returns all queued orders sorted by `createdAt`
    - Implement `removeFromQueue(id)`: removes single entry by id
    - _Requirements: 3.9_
  - [~] 10.2 Create `src/features/pos/hooks/useOfflineSync.ts` hook that listens to online/offline events
    - Listen to `navigator.onLine`, `window` `'offline'`/`'online'` events
    - While offline: route `createOrder` calls to `enqueueOrder()` instead of API
    - On coming online: drain queue via `dequeueAll()`, POST each to `/api/orders`, call `removeFromQueue(id)` on success
    - Render `OfflineBanner` component when offline
    - _Requirements: 3.9_

- [~] 11. Checkpoint — Phase 2 complete
  - Ensure auth middleware, RBAC, realtime helpers, and offline queue compile and function correctly. Ask the user if any questions arise.

---

### Phase 3 — Feature Modules

- [ ] 12. Dashboard Enhancement
  - [~] 12.1 Update `src/app/dashboard/page.tsx` and `src/components/DashboardWidgets.tsx` with all required metric cards
    - Add metric cards: Revenue, Orders, Reservations, Kitchen Status, Inventory Alerts, Today's Sales, Staff Online, Customer Satisfaction, Table Occupancy, Delivery Metrics, Profit Margin, Average Order Value
    - Use `Skeleton` primitive for loading states, `EmptyState` primitive for zero-data states
    - Apply `.metric-value` CSS class with count-up transition on data refresh
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [~] 12.2 Update `src/components/DashboardCharts.tsx` with revenue area chart and peak-hour bar chart using Recharts
    - Area chart: daily revenue over selected date range
    - Bar chart: average order volume per hour of day
    - Add `refetchInterval: 30_000` to React Query hooks
    - _Requirements: 2.4, 2.6_
  - [~] 12.3 Add ARIA labels, `aria-live` regions, and keyboard navigation to all dashboard widgets
    - All interactive elements: visible focus indicators, ARIA labels
    - Live data updates: `aria-live="polite"` on metric cards
    - _Requirements: 2.7, 2.8_

- [ ] 13. Menu Management
  - [~] 13.1 Create API routes for menu: `src/app/api/menu/categories/route.ts`, `src/app/api/menu/items/route.ts`, `src/app/api/menu/items/reorder/route.ts`
    - All routes: `apiResponse`/`apiError` envelope, `requireRole('manager')`, Zod validation, pagination
    - Categories: GET (list), POST (create), PATCH `[id]` (update), DELETE `[id]` (soft delete)
    - Items: GET (list with `?categoryId=`), POST (create), PATCH `[id]`, DELETE `[id]` (soft delete)
    - Reorder: PATCH accepting `[{ id, sort_order }]` array, single `upsert` call
    - _Requirements: 4.1, 4.5, 18.1, 18.2_
  - [~] 13.2 Create `src/features/menu-management/` folder structure with components, hooks, utils, types
    - `components/`: `MenuManagerLayout.tsx`, `CategoryList.tsx`, `ItemGrid.tsx`, `MenuItemCard.tsx`, `MenuItemFormDrawer.tsx`, `BulkActionBar.tsx`, `AvailabilityScheduler.tsx`
    - `hooks/`: `useMenuCategories.ts`, `useMenuItems.ts`, `useUpdateMenuItem.ts`
    - `utils/`: `isMenuItemAvailable.ts` — pure function checking `availability.days` and time range against `dateTime`
    - `types.ts`: `MenuItemForm`, `VariantRow`, `ModifierRow` interfaces
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [~] 13.3 Implement variant and modifier builder in `MenuItemFormDrawer.tsx`
    - Dynamic row adding/removing for variants (name, price_delta) and modifiers (name, price_delta)
    - `AvailabilityScheduler`: day-of-week checkbox matrix + time range picker
    - Image upload via `FileUpload` primitive → `supabase.storage.from('menu-images').upload()` → store CDN URL
    - _Requirements: 4.2, 4.3, 4.4, 4.8_
  - [~] 13.4 Implement drag-and-drop reordering and bulk actions
    - `@dnd-kit/sortable` for item reordering within category and category reordering
    - `BulkActionBar`: checkbox select-all, bulk price-change modal, bulk availability toggle
    - Wire `onDragEnd` to PATCH `/api/menu/items/reorder`
    - _Requirements: 4.5, 4.6_
  - [~] 13.5 Create `src/app/menu/manage/page.tsx` wiring `MenuManagerLayout` into the App Router
    - Dynamic import with loading skeleton, `requireRole('manager')` server-side guard
    - _Requirements: 4.1_
  - [~] 13.6 Implement configurable pricing rules in `src/features/menu-management/utils/pricingRules.ts`
    - `applyHappyHourPrice(item, now, rules)`: checks current time against happy-hour windows
    - `applyComboPricing(items, combos)`: identifies combo matches and applies discount
    - _Requirements: 4.7_

- [ ] 14. POS Terminal
  - [~] 14.1 Create Zustand `posSlice.ts` in `src/features/pos/store/posSlice.ts` and merge into `src/store/useStore.ts`
    - State: `currentOrder`, `selectedTableId`, `paymentStep`, `splitCount`, `isOffline`
    - Actions: `addItem`, `removeItem`, `updateQuantity`, `applyDiscount`, `setTable`, `setPaymentStep`, `resetOrder`
    - _Requirements: 3.1, 3.2, 3.4_
  - [~] 14.2 Create POS utility functions in `src/features/pos/utils/`
    - `taxCalculator.ts`: `computeTax(subtotal, rate)` — pure, `subtotal × (rate / 100)`, never negative
    - `discountEngine.ts`: `applyDiscount(price, discount)` — supports percent and fixed, result ≥ 0, ≤ original
    - `splitBill.ts`: `splitBill(total, n)` — divides into n portions, remainder added to first, sum = total
    - `receiptFormatter.ts`: `formatReceipt(order, items, tenant)` — 80-char plain text with required fields
    - _Requirements: 3.3, 3.4, 3.5, 3.12_
  - [~] 14.3 Create POS components in `src/features/pos/components/`
    - `POSLayout.tsx`: two-panel grid (product left, order right)
    - `CategoryTabs.tsx`, `ProductGrid.tsx` (virtual scroll), `ProductCard.tsx` (tap-to-add)
    - `TableSelector.tsx`: shows tables with status (available, occupied, reserved)
    - `OrderCart.tsx`, `CartItem.tsx` (quantity stepper, item notes, item discount)
    - `DiscountBar.tsx`, `TaxSummary.tsx`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.8_
  - [~] 14.4 Create `SplitBillModal.tsx` and `PaymentModal.tsx` with multi-payment-method tabs
    - `SplitBillModal`: accepts split count n ≥ 2, renders n payment portions summing to total
    - `PaymentModal`: Cash / Card / Digital Wallet tabs, records `payment_method` on order
    - On confirmation: POST to `/api/orders`, route to KDS, create kitchen notification
    - _Requirements: 3.3, 3.6, 3.7_
  - [~] 14.5 Implement barcode scanning and receipt printing in `src/features/pos/`
    - `BarcodeScanner.tsx`: uses `BarcodeDetector` Web API with `zxing-wasm` fallback, camera modal
    - Wire scanned SKU to product lookup in product catalog
    - Receipt generation button: calls `formatReceipt()`, triggers Web Serial API or download
    - _Requirements: 3.11, 3.12_
  - [~] 14.6 Create refund workflow and API route `src/app/api/orders/[id]/refund/route.ts`
    - POST: validate refund amount ∈ [0, total_paid], apply refund, write audit log entry
    - UI: `RefundModal.tsx` in `src/features/pos/components/`
    - _Requirements: 3.10_
  - [~] 14.7 Update `src/app/pos/page.tsx` to wire POSLayout with all hooks and offline sync
    - Dynamic import with loading skeleton, integrate `useOfflineSync` hook, `useRealtimeOrders`
    - _Requirements: 3.1, 3.9_

- [ ] 15. Kitchen Display System (KDS)
  - [~] 15.1 Create KDS components in `src/features/kds/components/`
    - `KDSLayout.tsx`: full-screen capable (`100dvh`), full-screen toggle via `requestFullscreen()`
    - `KDSToolbar.tsx`: filter by order type and category, global search input, full-screen toggle, audio alert toggle
    - `KanbanBoard.tsx`: `@dnd-kit/core` `DndContext` wrapper, four `KanbanColumn` children
    - `KanbanColumn.tsx`: `SortableContext`, renders `OrderCard` list, labeled `New/Preparing/Ready/Served`
    - `OrderCard.tsx`: displays order number, table, items with kitchen notes, `PriorityBadge`, `OrderTimer`
    - `OrderTimer.tsx`: `useOrderTimer(placed_at)` hook, `setInterval(1000)`, warning CSS class after threshold
    - `AudioAlert.tsx`: `AudioContext.createOscillator()` beep on new order, no external audio files
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.9_
  - [~] 15.2 Implement drag-and-drop status updates and real-time sync for KDS
    - `onDragEnd`: PATCH `/api/orders/[id]` with new `kds_status`, invalidate `['orders']` query key
    - Wire `useRealtimeOrders` to auto-refresh Kanban on INSERT/UPDATE
    - _Requirements: 5.2_
  - [~] 15.3 Implement KDS filter and search logic in `src/features/kds/utils/kdsFilter.ts`
    - `filterCards(cards, { orderType, category })`: returns only cards matching all active filters
    - `searchCards(cards, query)`: filters by order number, table name, or item name
    - _Requirements: 5.7, 5.8_
  - [~] 15.4 Update `src/app/kitchen/page.tsx` to render `KDSLayout` with all hooks integrated
    - Dynamic import, `requireRole('kitchen')` guard, `useRealtimeOrders` hook
    - _Requirements: 5.1_

- [ ] 16. Inventory Management
  - [~] 16.1 Create inventory API routes: `src/app/api/inventory/[id]/adjust/route.ts`, `src/app/api/inventory/transfers/route.ts`, `src/app/api/purchase-orders/route.ts`
    - Adjust: POST validates delta, updates `inventory_items.quantity`, inserts `inventory_history` row (before/after snapshot), triggers low-stock notification if `quantity < threshold`
    - Transfers: POST deducts from source location, adds to destination, writes two `inventory_history` rows
    - Purchase orders: GET/POST/PATCH with `requireRole('manager')` and `apiResponse` envelope
    - Extend existing `src/app/api/inventory/route.ts` to use `apiResponse` envelope
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.8, 6.11_
  - [~] 16.2 Create `src/features/inventory/` folder with components, hooks, utils
    - `components/`: `InventoryLayout.tsx`, `InventoryTable.tsx`, `AdjustmentModal.tsx`, `PurchaseOrderDrawer.tsx`, `TransferModal.tsx`, `WasteLogModal.tsx`
    - `hooks/`: `useInventoryItems.ts`, `useAdjustStock.ts`, `usePurchaseOrders.ts`
    - `utils/`: `demandForecast.ts` — exponential smoothing: `forecast(t) = α * actual(t-1) + (1-α) * forecast(t-1)`
    - _Requirements: 6.1, 6.4, 6.7, 6.10_
  - [~] 16.3 Implement recipe costing auto-deduction in `src/app/api/orders/[id]/route.ts`
    - When `kds_status` is set to `'served'`: query `recipe_items` for each `order_item`, deduct quantities atomically, write `inventory_history` records
    - _Requirements: 6.2, 6.11_
  - [~] 16.4 Implement expiry date tracking and barcode scanning in inventory
    - Surface expiring-soon alerts (items with `expiry_date <= now + 3 days`) in `InventoryTable`
    - Wire `BarcodeScanner` component to lookup item by `barcode` field for stock receiving
    - _Requirements: 6.6, 6.9_
  - [~] 16.5 Update `src/app/inventory/page.tsx` to render `InventoryLayout`
    - Dynamic import, `requireRole('manager')` guard
    - _Requirements: 6.1_

- [ ] 17. Staff Management
  - [~] 17.1 Create staff API routes: `src/app/api/staff/employees/route.ts`, `src/app/api/staff/shifts/route.ts`, `src/app/api/staff/attendance/route.ts`
    - Employees: GET/POST/PATCH, `requireRole('manager')`, enforce cannot promote above own role
    - Shifts: GET/POST/PATCH, validate `end_at > start_at`, reject overlapping shifts for same employee
    - Attendance: POST clock-in (sets `clock_in_at`), POST clock-out (sets `clock_out_at`), validate `clock_out_at > clock_in_at`
    - All routes: `apiResponse` envelope, Zod validation, pagination
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [~] 17.2 Create `src/features/staff/` folder with components, hooks, utils
    - `components/`: `StaffLayout.tsx`, `EmployeeTable.tsx`, `EmployeeFormDrawer.tsx`, `ShiftScheduler.tsx`, `AttendanceLog.tsx`, `LeaveRequestPanel.tsx`, `TaskBoard.tsx`
    - `ShiftScheduler.tsx`: CSS Grid with employees as rows, time slots as columns, draggable shift blocks
    - `hooks/`: `useEmployees.ts`, `useShifts.ts`, `useAttendanceLogs.ts`
    - `utils/`: `detectShiftOverlap.ts` — `overlaps(shiftA, shiftB)` pure function
    - _Requirements: 7.1, 7.3, 7.4, 7.6, 7.7_
  - [~] 17.3 Implement payroll summary in `src/app/api/analytics/route.ts` with `?type=payroll` handler
    - SQL: `SUM(EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 3600)` for hours worked
    - Return `{ employee_id, full_name, hours_worked, hourly_rate, gross_pay }` per employee
    - _Requirements: 7.5_
  - [~] 17.4 Update `src/app/staff/page.tsx` to render `StaffLayout`
    - Dynamic import, `requireRole('manager')` guard
    - _Requirements: 7.1_

- [ ] 18. Customer Management & Loyalty
  - [~] 18.1 Create customer API routes: `src/app/api/customers/route.ts`, `src/app/api/customers/[id]/route.ts`, `src/app/api/customers/[id]/loyalty/route.ts`
    - Customers: GET (paginated, filterable), POST (create), PATCH (update), soft delete via `deleted_at`
    - Loyalty: GET (balance + history), POST `awardPoints(customerId, orderId, amount)` — inserts `loyalty_points` row with `floor(amount * earnRate)` points
    - Coupons: POST generate, GET validate, PATCH (toggle active)
    - All: `requireRole('cashier')`, `apiResponse` envelope
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [~] 18.2 Create `src/features/customers/` folder with components, hooks, utils
    - `components/`: `CustomerLayout.tsx`, `CustomerTable.tsx`, `CustomerProfileDrawer.tsx`, `LoyaltyCard.tsx`, `CouponManager.tsx`, `BirthdayReminderBanner.tsx`
    - `hooks/`: `useCustomers.ts`, `useLoyaltyPoints.ts`, `useCoupons.ts`
    - `utils/`: `validateCoupon.ts` — pure `validateCoupon(coupon, now)` function, `getBirthdayReminders.ts` — filters customers with birthday in `[D, D+7]`
    - _Requirements: 8.1, 8.5, 8.6_
  - [~] 18.3 Implement loyalty tier upgrade logic and automated notifications
    - After `awardPoints`, check cumulative points against tier thresholds (Bronze 0+, Silver 500+, Gold 2000+, Platinum 5000+)
    - If tier changed: update `customers.loyalty_tier`, insert `notifications` row to trigger real-time push
    - _Requirements: 8.3, 8.4, 8.7_
  - [~] 18.4 Create `src/app/customers/page.tsx` wiring `CustomerLayout`
    - Dynamic import, `requireRole('cashier')` guard
    - _Requirements: 8.1_

- [ ] 19. Reservations & Waitlist
  - [~] 19.1 Create reservation API routes: `src/app/api/reservations/route.ts`, `src/app/api/reservations/[id]/route.ts`, `src/app/api/waitlist/route.ts`
    - Reservations POST: query for overlapping `[reserved_at, reserved_at + duration]` on same `table_id`, return 422 if conflict
    - Reservations GET: support `?date=` filter and calendar view queries
    - Waitlist: POST add walk-in, PATCH `seated_at` / `cancelled_at`
    - All: `requireRole('waiter')`, `apiResponse` envelope, Zod validation
    - _Requirements: 9.1, 9.3, 9.4_
  - [~] 19.2 Create `src/features/reservations/` folder with components, hooks, utils
    - `components/`: `ReservationLayout.tsx`, `CalendarView.tsx` (day/week/month), `ReservationFormDrawer.tsx`, `WaitlistPanel.tsx`
    - `CalendarView.tsx`: renders reservations on a CSS grid calendar with day/week/month toggle
    - `hooks/`: `useReservations.ts`, `useWaitlist.ts`
    - `utils/`: `checkDoubleBooking.ts` — `intervalsOverlap(a, b)` pure time interval function
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [~] 19.3 Implement reservation confirmation and reminder notification logic
    - On reservation create/confirm: if `guest_phone` or `guest_email` present, insert notification row with SMS/email payload
    - Supabase Edge Function (cron) `send-reminders`: query reservations within 24h, `reminder_sent = false`, send, update flag
    - _Requirements: 9.5, 9.6, 9.7_
  - [~] 19.4 Create `src/app/reservations/page.tsx` wiring `ReservationLayout`
    - Dynamic import, `requireRole('waiter')` guard
    - _Requirements: 9.1_

- [ ] 20. Analytics Engine
  - [~] 20.1 Create `src/app/api/analytics/route.ts` with server-side aggregation queries
    - `?type=revenue&from=&to=&locationId=`: `DATE_TRUNC('day', created_at)` + `SUM(total_amount)` grouped by day
    - `?type=peak_hours`: `EXTRACT(HOUR FROM created_at)` + avg order count per hour
    - `?type=top_items`: join `order_items` + `menu_items`, `SUM(quantity)` grouped by item
    - `?type=customer_retention`: % customers with > 1 order in period
    - `?type=staff_performance`: orders handled + avg satisfaction per employee
    - `?type=inventory_valuation`: `SUM(quantity * cost_price)` per category
    - `?type=payroll`: hours worked + gross pay (from attendance logs)
    - `requireRole('manager')`, `apiResponse` envelope
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  - [~] 20.2 Create `src/features/analytics/` folder with components, hooks, utils
    - `components/`: `AnalyticsLayout.tsx`, `KPIRow.tsx`, `SalesTrendChart.tsx`, `PeakHourChart.tsx`, `TopItemsTable.tsx`, `StaffPerformanceTable.tsx`, `InventoryValuationCard.tsx`, `CustomerRetentionCard.tsx`, `ExportButton.tsx`
    - `hooks/`: `useAnalytics.ts` with `staleTime: 30_000`
    - `utils/`: `toCsv.ts` — pure `toCsv(rows, columns)` → CSV string, `downloadCsv(filename, csv)` → `URL.createObjectURL`
    - _Requirements: 11.2, 11.3, 11.8_
  - [~] 20.3 Update `src/app/analytics/page.tsx` to render `AnalyticsLayout` with date range picker and location selector
    - Dynamic import, `requireRole('manager')` guard
    - Location selector: supports single-location view and consolidated roll-up across all locations
    - _Requirements: 11.1, 16.4_

- [~] 21. Checkpoint — Phase 3 feature modules complete
  - Ensure all feature modules render without errors, API routes return correct envelopes, and data flows from Supabase to UI. Ask the user if any questions arise.

---

### Phase 4 — Cross-cutting Features

- [ ] 22. Notification Center
  - [~] 22.1 Extend `src/app/api/notifications/route.ts` to use `apiResponse` envelope and add PATCH for mark-read
    - GET: paginated list, grouped by type, `deleted_at IS NULL` filter
    - PATCH: mark individual or all as read (`read = true`)
    - _Requirements: 13.1, 13.3, 13.4_
  - [~] 22.2 Create Zustand `notificationSlice` in `src/features/notifications/store/notificationSlice.ts`
    - State: `notifications: NotificationRow[]`, computed `unreadCount`
    - Actions: `setNotifications`, `prependNotification`, `markRead(id)`, `markAllRead()`
    - Merge into `src/store/useStore.ts`
    - _Requirements: 13.2, 13.3_
  - [~] 22.3 Create `src/features/notifications/components/` with `NotificationBell.tsx`, `NotificationPanel.tsx`, `NotificationCard.tsx`
    - `NotificationBell`: unread badge count in `Navbar.tsx`
    - `NotificationPanel`: `Drawer` primitive, `AnimatePresence` grouped by type, `MarkAllReadButton`
    - `NotificationCard`: read/unread state, critical style (red badge + alert icon for low stock / failed payment)
    - Wire `useRealtimeNotifications` to prepend new notifications without page refresh
    - _Requirements: 13.1, 13.2, 13.5, 13.6_

- [ ] 23. Global Search
  - [~] 23.1 Create `src/app/api/search/route.ts` — parallel multi-entity search
    - Accept `?q=` (min 2 chars), run parallel Supabase queries across: orders, customers, inventory_items, menu_items, employees, reservations
    - Limit each entity group to 5 results, return grouped with count badges
    - `requireRole('waiter')`, `apiResponse` envelope, respond within 1s
    - _Requirements: 14.1, 14.2, 14.3_
  - [~] 23.2 Create Zustand `searchSlice` and `src/features/search/components/SearchResults.tsx`
    - `CommandPalette` wired via `Cmd/Ctrl+K` shortcut in `Navbar.tsx`
    - `useSearchQuery`: `useDeferredValue` 150ms debounce, skip if `< 2 chars`
    - `ResultGroup` per entity type with count badge
    - On result select: navigate to entity detail view, close palette
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [ ] 24. AI Insights Engine
  - [~] 24.1 Create `src/lib/ai.ts` with pure TypeScript insight functions
    - `detectWasteItems(inventoryHistory, menuItems)`: flags items where `waste_cost / revenue > 0.15`
    - `suggestStaffing(orderHistory, shifts)`: compares `avg_orders_per_hour` per day-of-week against shift coverage gaps
    - `forecastDemand(dailyOrders, days)`: exponential smoothing `α=0.3`, returns 7-day forecast array
    - `suggestPricing(menuItems, costData)`: flags items with margin `< 20%`
    - `suggestPromotions(hourlyRevenue, weeklyAvg)`: identifies hours/days below 60% of weekly average
    - Each function returns `{ id, type, title, description, impact, confidenceScore: number (0-100), generatedAt }`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - [~] 24.2 Create `src/features/ai-insights/` components and page
    - `components/`: `AIInsightsPanel.tsx`, `RecommendationCard.tsx` (with confidence score bar), `ApplyRecommendationButton.tsx`
    - On apply: POST audit log with `recommendation_id` and `type`
    - Wire into dashboard and analytics pages as a sidebar panel
    - _Requirements: 12.6, 12.7_

- [ ] 25. Online Ordering
  - [~] 25.1 Create public menu page `src/app/[tenant]/menu/page.tsx` with search, category filtering, and cart
    - No authentication required (public route, excluded from middleware guard)
    - Cart persisted to `localStorage`, hydrated in `useEffect` via Zustand
    - QR code table pre-fill: read `?table=` from `useSearchParams()`, set `tableNumber` in store
    - _Requirements: 10.1, 10.2, 10.5_
  - [~] 25.2 Create online order checkout and payment flow
    - Checkout page `src/app/[tenant]/checkout/page.tsx`: order summary, Pickup/Delivery selector, delivery address capture
    - `src/lib/payment.ts`: `createPaymentIntent(amount, currency, provider)` adapter pattern (Stripe/Chapa/mock)
    - On order placed: POST `/api/orders`, route to KDS, return `orderId` for tracking
    - _Requirements: 10.3, 10.4, 10.6, 10.7_
  - [~] 25.3 Create public order tracking page `src/app/[tenant]/order-tracking/page.tsx`
    - Timeline: `Placed → Preparing → Ready → Served`
    - Subscribe to `order_tracking:{orderId}` Realtime channel, update timeline in real time
    - No authentication required
    - _Requirements: 10.6, 10.8_

- [ ] 26. Settings Module
  - [~] 26.1 Create `src/app/api/settings/route.ts`: GET tenant settings, PATCH update settings
    - GET: reads `tenants.settings` JSONB column, `requireRole('admin')`
    - PATCH: validates payload, writes updated JSONB, inserts audit log with `before`/`after` values
    - _Requirements: 15.1, 15.6_
  - [~] 26.2 Create `src/features/settings/` with all 13 settings tabs
    - `components/`: `SettingsLayout.tsx`, and tab components: `OrganizationTab.tsx`, `LocationsTab.tsx`, `BrandingTab.tsx`, `ThemesTab.tsx`, `TaxCurrencyTab.tsx`, `LanguagesTab.tsx`, `KitchenTab.tsx`, `PaymentProvidersTab.tsx`, `PrinterTab.tsx`, `EmailTab.tsx`, `SMSTab.tsx`, `APIKeysTab.tsx`, `SecurityTab.tsx`
    - Each tab: dynamically imported, own React Query `useSettings(section)` hook
    - `APIKeysTab.tsx`: generate key (show raw once), store SHA-256 hash, revoke key (set `revoked_at`)
    - `TaxCurrencyTab.tsx`: add/edit tax rates with name, percentage, inclusive/exclusive
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  - [~] 26.3 Create `src/app/settings/page.tsx` wiring `SettingsLayout`
    - Dynamic import, `requireRole('admin')` guard
    - Theme toggle: persist to `localStorage('vador_theme')`, apply `.dark` class to root element, no page reload
    - _Requirements: 1.4, 15.1_

- [~] 27. Checkpoint — Phase 4 cross-cutting features complete
  - Ensure notifications, search, AI insights, online ordering, and settings all wire correctly to their API routes and Zustand slices. Ask the user if any questions arise.

---

### Phase 5 — Quality & Polish

- [ ] 28. Error Handling & Resilience
  - [~] 28.1 Wrap all page-level components in `ErrorBoundary` from `src/components/ui/ErrorBoundary.tsx`
    - Each major feature: `<ErrorBoundary fallback={<ErrorFallback section="..." />}>` wrapper
    - `ErrorFallback`: sanitized error message (no stack traces in production), "Try again" reset button
    - _Requirements: 18.7_
  - [~] 28.2 Add `try/catch` + `apiError('Internal server error', 500)` wrapper to all API route handlers that are missing it
    - Log full error to `src/lib/logger.ts` structured JSON without exposing to client
    - Add `OfflineBanner` component to `AppShell.tsx` wired to `navigator.onLine` events
    - _Requirements: 18.7, 3.9_
  - [~] 28.3 Add `Toast` notifications for all mutation success and error states across all feature hooks
    - `variant="success"` on `onSuccess`, `variant="error"` on `onError` with API `error` field message
    - `EmptyState` variants in all data-dependent widgets with contextual messages and CTAs
    - _Requirements: 2.3_

- [ ] 29. Performance Optimizations
  - [~] 29.1 Apply `next/dynamic` dynamic imports to all page-level feature components with loading skeleton fallbacks
    - All pages under `src/app/(app)/` and feature layouts use `dynamic(() => import(...), { loading: () => <Skeleton/> })`
    - _Requirements: 20.2_
  - [~] 29.2 Apply `React.memo` to hot-path components and `useMemo` to expensive computations
    - Wrap with `React.memo`: `ProductCard`, `OrderCard`, `MetricCard`, `NotificationCard`
    - Wrap with `useMemo`: analytics chart data transforms, keyed on `dateRange` dependency
    - _Requirements: 20.3_
  - [~] 29.3 Replace all `<img>` tags with Next.js `<Image>` and add `Cache-Control` headers to API routes
    - All images: `width`, `height` props, `format="webp"`, Supabase Storage CDN URLs
    - API routes: `Cache-Control: s-maxage=30, stale-while-revalidate=60` headers
    - _Requirements: 20.4, 20.5_

- [ ] 30. Accessibility Audit
  - [~] 30.1 Audit and fix ARIA attributes across all interactive components
    - All form inputs: `aria-label` or `<label>` with `htmlFor`, `aria-describedby` for error messages
    - All modals/drawers: `aria-modal="true"`, `role="dialog"`, `aria-labelledby`
    - All buttons: descriptive `aria-label` when text is icon-only
    - All data-updating regions: `aria-live="polite"` (or `"assertive"` for critical alerts)
    - _Requirements: 21.1, 21.6_
  - [~] 30.2 Audit keyboard navigation flow across all pages
    - Ensure Tab order is logical and consistent on all pages
    - All modals: focus trap on open, focus restore to trigger on close
    - `CommandPalette`: Arrow key navigation, Enter to select, Escape to close
    - All images: descriptive `alt` text; decorative images: `alt=""`
    - _Requirements: 21.2, 21.4, 21.5_

- [ ] 31. Animation & Micro-interactions
  - [~] 31.1 Add Framer Motion page transition wrapper to `src/app/layout.tsx`
    - Consistent enter/exit: `fade + translateY` pattern via `AnimatePresence`
    - _Requirements: 22.1_
  - [~] 31.2 Apply spring animations to all Drawer/Modal open/close via `Modal.tsx` and `Drawer.tsx` primitives
    - Spring config: `damping: 25, stiffness: 200`
    - `.glass-panel-hover` lift: `translateY(-2px)` + gold border glow on metric card hover
    - Respect `prefers-reduced-motion`: wrap all non-essential animations in `@media (prefers-reduced-motion: no-preference)` or Framer Motion `useReducedMotion()`
    - _Requirements: 22.2, 22.3, 22.6_

- [ ] 32. Mobile Responsive Pass
  - [~] 32.1 Audit and fix all pages for viewport widths 320px – 1920px
    - Sidebar: collapse to bottom nav bar or hamburger drawer at `< 768px`
    - All grids and tables: responsive column stacking with Tailwind `sm:`, `md:`, `lg:` breakpoints
    - Replace hover-only interactions with tap-friendly equivalents for touch devices
    - _Requirements: 23.1, 23.2, 23.3_
  - [~] 32.2 Ensure POS and KDS support touch drag-and-drop on tablet screens
    - `@dnd-kit` pointer sensor + touch sensor configured for POS `TableSelector` and KDS `KanbanBoard`
    - All tap targets ≥ 44×44px on mobile
    - _Requirements: 23.4, 23.5_

- [~] 33. Checkpoint — Phase 5 quality & polish complete
  - Ensure the app compiles without TypeScript errors, all pages render at 320px and 1280px, error boundaries are in place, and performance optimizations are applied. Ask the user if any questions arise.

---

### Phase 6 — Testing

- [ ] 34. PBT — POS & Menu (Properties P2–P10)
  - [ ]* 34.1 Write property test for Tax Calculation Invariant (`P2`)
    - File: `src/features/pos/__tests__/taxCalculator.property.test.ts`
    - **Property 2: Tax Calculation Invariant** — `computeTax(subtotal, rate)` equals `subtotal × (rate/100)`, never negative
    - **Validates: Requirements 3.5**
  - [ ]* 34.2 Write property test for Discount Calculation Invariant (`P3`)
    - File: `src/features/pos/__tests__/discountEngine.property.test.ts`
    - **Property 3: Discount Calculation Invariant** — discounted price ∈ [0, original price]
    - **Validates: Requirements 3.4**
  - [ ]* 34.3 Write property test for Split Bill Conservation (`P4`)
    - File: `src/features/pos/__tests__/splitBill.property.test.ts`
    - **Property 4: Split Bill Conservation** — `sum(splitBill(total, n)) === total` for any n ≥ 2
    - **Validates: Requirements 3.3**
  - [ ]* 34.4 Write property test for Offline Queue Round-Trip (`P5`)
    - File: `src/features/pos/__tests__/offlineQueue.property.test.ts`
    - **Property 5: POS Offline Queue Round-Trip** — enqueue then dequeueAll returns same payloads in same order
    - **Validates: Requirements 3.9**
  - [ ]* 34.5 Write property test for Refund Amount Constraint (`P6`)
    - File: `src/features/pos/__tests__/refund.property.test.ts`
    - **Property 6: Refund Amount Constraint** — refund ∈ [0, total_paid]; excess refund returns error
    - **Validates: Requirements 3.10**
  - [ ]* 34.6 Write property test for Receipt Contains Required Fields (`P7`)
    - File: `src/features/pos/__tests__/receiptFormatter.property.test.ts`
    - **Property 7: Receipt Contains Required Fields** — receipt string contains order number, each item name/qty, subtotal, tax, total
    - **Validates: Requirements 3.12**
  - [ ]* 34.7 Write property test for Menu Item Availability Scheduling (`P8`)
    - File: `src/features/menu-management/__tests__/availability.property.test.ts`
    - **Property 8: Menu Item Availability Scheduling** — `isMenuItemAvailable(item, dt)` iff day ∈ days AND time ∈ [from, to]
    - **Validates: Requirements 4.4**
  - [ ]* 34.8 Write property test for Menu Item Price Variant Invariant (`P9`)
    - File: `src/features/menu-management/__tests__/variantPricing.property.test.ts`
    - **Property 9: Menu Item Price Variant Invariant** — effective price = `base_price + price_delta` ≥ 0
    - **Validates: Requirements 4.3**
  - [ ]* 34.9 Write property test for Drag-and-Drop Reorder Preserves Set (`P10`)
    - File: `src/features/menu-management/__tests__/reorder.property.test.ts`
    - **Property 10: Drag-and-Drop Reorder Preserves Set** — any permutation produces same item ID set, same length
    - **Validates: Requirements 4.6**

- [ ] 35. PBT — KDS & Inventory (Properties P11–P16)
  - [ ]* 35.1 Write property test for KDS Status Transition Invariant (`P11`)
    - File: `src/features/kds/__tests__/statusTransition.property.test.ts`
    - **Property 11: KDS Status Transition Invariant** — after update to status Y, order.kds_status = Y and not in column X
    - **Validates: Requirements 5.2**
  - [ ]* 35.2 Write property test for KDS Timer Accuracy (`P12`)
    - File: `src/features/kds/__tests__/timer.property.test.ts`
    - **Property 12: KDS Timer Accuracy** — `computeElapsedSeconds(placed_at, now)` = `Math.floor((now - placed_at) / 1000)`
    - **Validates: Requirements 5.3**
  - [ ]* 35.3 Write property test for KDS Filter Completeness (`P13`)
    - File: `src/features/kds/__tests__/filter.property.test.ts`
    - **Property 13: KDS Filter Completeness** — filtered results contain exactly cards satisfying predicate, no more, no less
    - **Validates: Requirements 5.7**
  - [ ]* 35.4 Write property test for Inventory Deduction Round-Trip (`P14`)
    - File: `src/features/inventory/__tests__/deduction.property.test.ts`
    - **Property 14: Inventory Deduction Round-Trip** — `inventory_history.quantity_before - quantity_after = amount_deducted` and `current_quantity = before - deducted`
    - **Validates: Requirements 6.2, 6.11**
  - [ ]* 35.5 Write property test for Low Stock Alert Invariant (`P15`)
    - File: `src/features/inventory/__tests__/lowStockAlert.property.test.ts`
    - **Property 15: Low Stock Alert Invariant** — alert exists iff `quantity < threshold`; no alert when `quantity ≥ threshold`
    - **Validates: Requirements 6.3**
  - [ ]* 35.6 Write property test for Inter-Location Transfer Conservation (`P16`)
    - File: `src/features/inventory/__tests__/transfer.property.test.ts`
    - **Property 16: Inter-Location Transfer Conservation** — `qty_A_after = qty_A_before - Q` and `qty_B_after = qty_B_before + Q`
    - **Validates: Requirements 6.8, 16.3**

- [ ] 36. PBT — Staff & Customers (Properties P17–P23)
  - [ ]* 36.1 Write property test for RBAC Hierarchy Ordering (`P17`)
    - File: `src/features/staff/__tests__/rbac.property.test.ts`
    - **Property 17: RBAC Hierarchy Ordering** — role A (higher rank) passes role B check; role B fails role A check with 403
    - **Validates: Requirements 7.2, 17.3, 17.5**
  - [ ]* 36.2 Write property test for Shift Non-Overlap Invariant (`P18`)
    - File: `src/features/staff/__tests__/shiftOverlap.property.test.ts`
    - **Property 18: Shift Non-Overlap Invariant** — any two shifts for same employee must not have overlapping `[start_at, end_at]` intervals
    - **Validates: Requirements 7.3**
  - [ ]* 36.3 Write property test for Attendance Clock Ordering (`P19`)
    - File: `src/features/staff/__tests__/attendance.property.test.ts`
    - **Property 19: Attendance Clock Ordering** — `clock_out_at` is null or strictly > `clock_in_at`
    - **Validates: Requirements 7.4**
  - [ ]* 36.4 Write property test for Payroll Gross Pay Formula (`P20`)
    - File: `src/features/staff/__tests__/payroll.property.test.ts`
    - **Property 20: Payroll Gross Pay Formula** — `gross_pay = hourly_rate × hours_worked` within tolerance 0.01
    - **Validates: Requirements 7.5**
  - [ ]* 36.5 Write property test for Loyalty Points Award Invariant (`P21`)
    - File: `src/features/customers/__tests__/loyaltyPoints.property.test.ts`
    - **Property 21: Loyalty Points Award Invariant** — `points_delta = floor(T × R)` and `total_points = SUM(all points_delta)`
    - **Validates: Requirements 8.4**
  - [ ]* 36.6 Write property test for Coupon Validity Constraints (`P22`)
    - File: `src/features/customers/__tests__/coupon.property.test.ts`
    - **Property 22: Coupon Validity Constraints** — `validateCoupon` returns false if expired, usage exceeded, or inactive; true only when none hold
    - **Validates: Requirements 8.5**
  - [ ]* 36.7 Write property test for Birthday Reminder Window (`P23`)
    - File: `src/features/customers/__tests__/birthdayReminder.property.test.ts`
    - **Property 23: Birthday Reminder Window** — reminder set contains exactly customers with birthday (month-day) ∈ [D, D+7], no false inclusions or omissions
    - **Validates: Requirements 8.6**

- [ ] 37. PBT — Reservations, Analytics & AI (Properties P24–P29)
  - [ ]* 37.1 Write property test for Reservation No Double-Booking (`P24`)
    - File: `src/features/reservations/__tests__/doubleBooking.property.test.ts`
    - **Property 24: Reservation No Double-Booking** — overlapping reservations for same table_id must be rejected with error
    - **Validates: Requirements 9.3**
  - [ ]* 37.2 Write property tests for Revenue Consistency and AOV Formula (`P25, P26`)
    - File: `src/features/analytics/__tests__/revenue.property.test.ts`
    - **Property 25: Analytics Revenue Consistency** — API total = direct `SUM(total_amount)` for same tenant/location/date range
    - **Property 26: Analytics AOV Formula** — `AOV = total_revenue / count(orders)`, no rounding before final result
    - **Validates: Requirements 11.1, 11.5, 11.10**
  - [ ]* 37.3 Write property test for Inventory Valuation Consistency (`P27`)
    - File: `src/features/analytics/__tests__/inventoryValuation.property.test.ts`
    - **Property 27: Inventory Valuation Consistency** — analytics total = `SUM(quantity × cost_price)` for non-deleted items
    - **Validates: Requirements 11.7**
  - [ ]* 37.4 Write property test for CSV Export Completeness (`P28`)
    - File: `src/features/analytics/__tests__/csvExport.property.test.ts`
    - **Property 28: CSV Export Completeness** — `toCsv(rows, columns)` produces exactly N data rows + 1 header, each row has exactly M fields
    - **Validates: Requirements 11.8**
  - [ ]* 37.5 Write property test for AI Confidence Score Bounds (`P29`)
    - File: `src/features/ai-insights/__tests__/confidence.property.test.ts`
    - **Property 29: AI Confidence Score Bounds** — every recommendation's `confidenceScore` is an integer ∈ [0, 100]
    - **Validates: Requirements 12.6**

- [ ] 38. PBT — API & Auth (Properties P30–P39)
  - [ ]* 38.1 Write property test for Notification Unread Count Invariant (`P30`)
    - File: `src/features/notifications/__tests__/unreadCount.property.test.ts`
    - **Property 30: Notification Unread Count Invariant** — `unreadCount = count(n where n.read = false)`; after markAllRead, count = 0
    - **Validates: Requirements 13.2, 13.3**
  - [ ]* 38.2 Write property test for Global Search Result Grouping (`P31`)
    - File: `src/features/search/__tests__/grouping.property.test.ts`
    - **Property 31: Global Search Result Grouping** — every result in a group has same entity type; group count badge = group length
    - **Validates: Requirements 14.3**
  - [ ]* 38.3 Write property tests for API Pagination, Filtering, Sorting, and Envelope Shape (`P32–P35`)
    - File: `src/lib/__tests__/api.property.test.ts`
    - **Property 32: API Pagination Consistency** — items in data ≤ pageSize; meta.total = unpaginated count; all pages yield meta.total unique items
    - **Property 33: API Filtering Soundness** — every item in data satisfies filter predicate
    - **Property 34: API Sorting Correctness** — consecutive pairs satisfy asc/desc ordering invariant
    - **Property 35: API Response Envelope Shape** — every response parseable as `{ data, error, meta }`
    - **Validates: Requirements 18.1, 18.3, 18.4, 18.5**
  - [ ]* 38.4 Write property tests for Tenant and Location Data Isolation (`P36, P37`)
    - File: `src/lib/__tests__/tenantIsolation.property.test.ts`
    - **Property 36: Tenant Data Isolation** — JWT claim tenant_slug=A returns no rows with tenant_slug=B
    - **Property 37: Location-Scoped Query Isolation** — query with locationId=L returns only rows with location_id=L
    - **Validates: Requirements 19.6, 16.2, 16.5**
  - [ ]* 38.5 Write property test for Auth 401 on Unauthenticated Request (`P38`)
    - File: `src/lib/__tests__/auth.property.test.ts`
    - **Property 38: Auth 401 on Unauthenticated Request** — any protected route + no valid session → response status = 401
    - **Validates: Requirements 17.4**
  - [ ]* 38.6 Write property test for Settings Audit Log Completeness (`P39`)
    - File: `src/features/settings/__tests__/auditLog.property.test.ts`
    - **Property 39: Settings Audit Log Completeness** — settings change → audit_log row with correct user_id, action='settings_update', details.before and details.after
    - **Validates: Requirements 15.6**
  - [ ]* 38.7 Write property test for Theme Persistence Round-Trip (`P1`)
    - File: `src/lib/__tests__/themeStorage.property.test.ts`
    - **Property 1: Theme Persistence Round-Trip** — `setTheme(v)` then `localStorage.getItem('vador_theme')` returns v, for v ∈ {'dark','light'}
    - **Validates: Requirements 1.4**

- [ ] 39. Unit & Integration Tests
  - [ ]* 39.1 Write unit tests for core utility functions
    - `src/lib/__tests__/response.test.ts`: `apiResponse` and `apiError` return correct shape and status codes
    - `src/lib/__tests__/validators.test.ts`: Zod schemas reject invalid payloads, return 422 with field errors
    - `src/features/pos/__tests__/taxCalculator.test.ts`: zero rate = zero tax, 100% rate = subtotal, fractional cents
    - `src/features/pos/__tests__/receiptFormatter.test.ts`: receipt with single item, receipt with multi-item, receipt with discount
    - _Requirements: 18.1, 18.2, 3.5, 3.12_
  - [ ]* 39.2 Write unit tests for feature components
    - `src/components/__tests__/AppShell.test.tsx`: renders title, description, badge
    - `src/app/dashboard/__tests__/Dashboard.test.tsx`: loading skeletons render, empty states render
    - `src/components/__tests__/Sidebar.test.tsx`: location switcher dropdown, collapse toggle
    - `src/components/__tests__/Navbar.test.tsx`: notification badge count, Cmd+K opens CommandPalette
    - `src/app/pos/__tests__/POSPage.test.tsx`: category tab switches product grid, cart item added
    - `src/app/kitchen/__tests__/KDSPage.test.tsx`: order card renders with correct priority badge
    - _Requirements: 2.1, 2.2, 3.1, 5.5_
  - [ ]* 39.3 Write unit tests for API route handlers
    - `src/app/api/orders/__tests__/orders.test.ts`: POST creates order, GET returns paginated list with meta.total
    - `src/app/api/health/__tests__/health.test.ts`: returns `{ data: { status: 'ok', timestamp }, error: null }`
    - `src/app/api/menu/__tests__/menu.test.ts`: POST creates item, soft delete sets deleted_at, GET excludes deleted
    - _Requirements: 18.1, 18.3, 18.6_
  - [ ]* 39.4 Write integration tests for RLS and auth
    - `src/test/integration/rls.integration.test.ts`: tenant A query returns 0 rows for tenant B data
    - `src/test/integration/auth.integration.test.ts`: unauthenticated → 401, wrong role → 403
    - `src/test/integration/realtime.integration.test.ts`: order INSERT triggers KDS channel event
    - _Requirements: 17.3, 17.4, 17.5, 19.6_
  - [ ]* 39.5 Write accessibility unit tests
    - `src/components/__tests__/a11y.test.tsx`: ARIA attributes, focus trap, keyboard navigation on `Modal`, `Drawer`, `CommandPalette`, `DataTable`
    - _Requirements: 21.1, 21.5, 21.6_

- [~] 40. Final Checkpoint — All tests passing
  - Run `npm run test` and ensure all non-optional tests pass. Review any failing optional PBT tests and decide whether to address them. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- All tasks reference specific requirements for full traceability
- Phase dependencies must be respected: each phase builds on the previous
- fast-check property tests run 100 iterations each (configured via `configureGlobal` in `src/test/setup.ts`)
- All new API routes must use `apiResponse`/`apiError` from `src/lib/response.ts` — no raw `Response.json` calls
- All new tables must include `deleted_at` and all queries must filter `deleted_at IS NULL`
- Existing code in `src/components/`, `src/lib/`, `src/app/`, `src/store/`, `src/data/` is preserved and enhanced only


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "3.1", "3.2", "4.1", "5.1"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "2.4", "4.2", "4.3", "4.4", "4.5", "4.6", "5.2"]
    },
    {
      "id": 2,
      "tasks": ["7.1", "7.2", "7.3", "7.4", "8.1", "9.1", "9.2", "10.1"]
    },
    {
      "id": 3,
      "tasks": ["8.2", "8.3", "10.2"]
    },
    {
      "id": 4,
      "tasks": ["12.1", "12.2", "12.3", "13.1", "14.1", "14.2", "15.1", "16.1", "17.1", "18.1", "19.1", "20.1"]
    },
    {
      "id": 5,
      "tasks": ["13.2", "13.6", "14.3", "15.2", "15.3", "16.2", "17.2", "18.2", "19.2", "20.2"]
    },
    {
      "id": 6,
      "tasks": ["13.3", "13.4", "14.4", "14.5", "14.6", "14.7", "15.4", "16.3", "16.4", "16.5", "17.3", "17.4", "18.3", "18.4", "19.3", "19.4", "20.3"]
    },
    {
      "id": 7,
      "tasks": ["13.5", "22.1", "22.2", "22.3", "23.1", "24.1", "25.1", "26.1"]
    },
    {
      "id": 8,
      "tasks": ["23.2", "24.2", "25.2", "26.2"]
    },
    {
      "id": 9,
      "tasks": ["25.3", "26.3"]
    },
    {
      "id": 10,
      "tasks": ["28.1", "28.2", "28.3", "29.1", "29.2", "29.3", "30.1", "30.2", "31.1", "31.2", "32.1", "32.2"]
    },
    {
      "id": 11,
      "tasks": ["34.1", "34.2", "34.3", "34.4", "34.5", "34.6", "34.7", "34.8", "34.9", "35.1", "35.2", "35.3", "35.4", "35.5", "35.6", "36.1", "36.2", "36.3", "36.4", "36.5", "36.6", "36.7", "37.1", "37.2", "37.3", "37.4", "37.5", "38.1", "38.2", "38.3", "38.4", "38.5", "38.6", "38.7"]
    },
    {
      "id": 12,
      "tasks": ["39.1", "39.2", "39.3", "39.4", "39.5"]
    }
  ]
}
```
