# Requirements Document

## Introduction

Vador OS is an existing Next.js 15 restaurant SaaS platform built on Supabase, Zustand, React Query, Recharts, and Framer Motion. The current codebase has a functioning AppShell layout, sidebar, navbar, dashboard with metric cards and charts, a customer-facing menu with cart and order tracking, and API routes for orders, inventory, notifications, and audit logs with multi-tenant (tenant_slug) row-level security.

This specification defines the requirements to transform Vador OS into a production-ready, enterprise-grade Restaurant Operating System. The key constraint is to preserve and enhance all working code — rewriting only where genuinely necessary — and to build only the features that are genuinely missing.

## Glossary

- **System**: The Vador OS platform as a whole
- **POS_Terminal**: The point-of-sale interface used by cashiers and waiters
- **KDS**: Kitchen Display System — the real-time order board for kitchen staff
- **Menu_Manager**: The admin interface for managing menu items, categories, variants, and pricing
- **Inventory_Manager**: The interface for tracking ingredients, stock levels, suppliers, and purchase orders
- **Staff_Manager**: The interface for managing employees, roles, shifts, and attendance
- **Customer_Manager**: The interface for managing customer profiles, loyalty, and communication
- **Reservation_Manager**: The interface for table bookings, waitlists, and capacity
- **Order_Flow**: The lifecycle of an order from placement through preparation to completion
- **Analytics_Engine**: The module computing revenue, sales trends, and performance reports
- **AI_Insights_Engine**: The module generating AI-powered recommendations for operations
- **Notification_Center**: The real-time notification system for all operational alerts
- **Global_Search**: The cross-entity search capability spanning all modules
- **Design_System**: The unified set of semantic tokens, color palette, typography, and component patterns
- **Auth_System**: The authentication and authorization layer including RBAC, sessions, and audit
- **Tenant**: A single restaurant or restaurant group identified by a `tenant_slug`
- **Location**: A physical restaurant branch within a Tenant
- **Role**: A user_role enum value: admin, manager, cashier, kitchen, waiter, customer
- **Soft_Delete**: A deletion pattern that sets a `deleted_at` timestamp instead of removing rows


## Requirements

### Requirement 1: Design System & Theming

**User Story:** As an operator, I want the interface to use a consistent restaurant-inspired design system with light and dark modes, so that the platform feels professional and on-brand.

#### Acceptance Criteria

1. THE Design_System SHALL define semantic CSS custom property tokens for background, foreground, primary, secondary, muted, accent, destructive, border, and ring colors in both light and dark modes.
2. THE Design_System SHALL use a restaurant-inspired color palette including warm white (#FCFBFA), charcoal (#1C1917), coffee brown (#C5A880), forest green (#10B981), muted gold (#DFA95A), and accent orange (#F97316).
3. THE Design_System SHALL apply the Inter typeface as the primary font family with defined size, weight, and line-height scales for headings, body, labels, and captions.
4. WHEN a user toggles the theme, THE System SHALL persist the selection to localStorage and apply the corresponding CSS class to the root HTML element without a full page reload.
5. THE Design_System SHALL provide reusable utility classes for glassmorphism panels, luxury gradient text, hover lift effects, and loading shimmer animations.
6. THE Design_System SHALL meet WCAG AA contrast ratios for all text on background combinations in both light and dark themes.

---

### Requirement 2: Dashboard Enhancement

**User Story:** As a restaurant manager, I want an enhanced operations dashboard with comprehensive widgets and charts, so that I can monitor all key business metrics at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display metric cards for Revenue, Orders, Reservations, Kitchen Status, Inventory Alerts, Today's Sales, Staff Online, Customer Satisfaction, Table Occupancy, Delivery Metrics, Profit Margin, and Average Order Value.
2. WHEN dashboard data is loading, THE Dashboard SHALL render loading skeleton components for each widget to prevent layout shift.
3. WHEN no data exists for a widget, THE Dashboard SHALL display a contextual empty state with a descriptive message and a call-to-action.
4. THE Dashboard SHALL include an area chart for revenue trends over time and a bar chart for peak-hour order volume.
5. WHEN a metric card is hovered, THE Dashboard SHALL apply a smooth lift animation with a gold border accent.
6. THE Dashboard SHALL refresh live data at a configurable interval (default 30 seconds) using React Query's `refetchInterval`.
7. THE Dashboard SHALL be accessible with full keyboard navigation, ARIA labels on all interactive elements, and screen reader announcements for data updates.
8. THE Dashboard SHALL render correctly on mobile (≥ 320px), tablet (≥ 768px), and desktop (≥ 1280px) viewport widths.

---

### Requirement 3: POS Terminal

**User Story:** As a cashier or waiter, I want a full-featured POS terminal, so that I can take orders, apply discounts, process multiple payment methods, and send orders to the kitchen.

#### Acceptance Criteria

1. THE POS_Terminal SHALL display a product catalog browsable by category with tap-to-add functionality.
2. THE POS_Terminal SHALL support table selection and table management including table status (available, occupied, reserved).
3. WHEN an order is confirmed, THE POS_Terminal SHALL allow the operator to split the bill between 2 or more payment portions.
4. THE POS_Terminal SHALL support applying item-level and order-level discounts by percentage or fixed amount.
5. THE POS_Terminal SHALL calculate and display tax amounts based on configurable tax rates per tenant.
6. THE POS_Terminal SHALL accept payment via Cash, Card, and Digital Wallet methods and record the payment method per order.
7. WHEN an order is placed, THE POS_Terminal SHALL route the order to the KDS and create a notification for kitchen staff.
8. THE POS_Terminal SHALL support capturing order notes at both the order level and per line item.
9. WHEN the device is offline, THE POS_Terminal SHALL queue orders locally and sync them automatically when connectivity is restored.
10. THE POS_Terminal SHALL support processing full or partial refunds on completed orders with an audit log entry.
11. THE POS_Terminal SHALL support barcode scanning to add items by SKU.
12. WHEN a receipt is required, THE POS_Terminal SHALL generate a formatted receipt suitable for thermal printer output.

---

### Requirement 4: Menu Management

**User Story:** As a restaurant manager, I want a full CRUD menu management interface, so that I can maintain our menu catalog with categories, variants, pricing rules, and availability schedules.

#### Acceptance Criteria

1. THE Menu_Manager SHALL support creating, reading, updating, and deleting menu categories and menu items.
2. WHEN an item is created, THE Menu_Manager SHALL accept name, description, price, category, images, tags, nutritional information, and allergy labels.
3. THE Menu_Manager SHALL support defining item variants (e.g., size: Small, Medium, Large) and modifiers (e.g., extra shot, oat milk) with per-variant pricing.
4. THE Menu_Manager SHALL support setting item availability by day of week and time range for scheduling seasonal or limited menus.
5. WHEN bulk editing, THE Menu_Manager SHALL allow selecting multiple items and applying a price change or availability toggle in a single operation.
6. THE Menu_Manager SHALL support drag-and-drop reordering of items within a category and reordering of categories.
7. THE Menu_Manager SHALL support configurable pricing rules including happy-hour pricing and combo pricing.
8. WHEN an image is uploaded for a menu item, THE Menu_Manager SHALL optimize the image and store it with a CDN-friendly URL.

---

### Requirement 5: Kitchen Display System (KDS)

**User Story:** As a kitchen team member, I want a modern Kanban-style KDS, so that I can track, prioritize, and complete orders in real time.

#### Acceptance Criteria

1. THE KDS SHALL display orders in Kanban columns: New, Preparing, Ready, and Served.
2. WHEN an order is dragged from one column to another, THE KDS SHALL update the order status in the database and emit a real-time notification.
3. THE KDS SHALL display a countdown timer for each order starting from the time it was placed.
4. WHEN an order timer exceeds the configured preparation estimate, THE KDS SHALL highlight the order card with a warning color and optionally play an audio alert.
5. THE KDS SHALL support assigning priority labels (Normal, Urgent, VIP) to order cards.
6. THE KDS SHALL support full-screen mode for mounting on a dedicated kitchen display.
7. THE KDS SHALL support filtering order cards by order type (Dine-in, Takeaway, Delivery) and by item category.
8. THE KDS SHALL support global search across visible order cards by order number, table, or item name.
9. THE KDS SHALL display kitchen notes per order item.

---

### Requirement 6: Inventory Management

**User Story:** As a manager, I want a comprehensive inventory management module, so that I can track ingredients, manage suppliers, raise purchase orders, and prevent stock-outs.

#### Acceptance Criteria

1. THE Inventory_Manager SHALL support CRUD operations for ingredients with name, SKU, unit, quantity, threshold, cost price, supplier, expiry date, and location.
2. WHEN an order is completed, THE Inventory_Manager SHALL automatically deduct ingredient quantities based on recipe-level costing rules.
3. WHEN an inventory item's quantity falls below its threshold, THE Inventory_Manager SHALL trigger a low stock alert notification.
4. THE Inventory_Manager SHALL support creating and tracking purchase orders with supplier, items, quantities, expected delivery date, and status.
5. THE Inventory_Manager SHALL record all stock adjustments with timestamp, user, reason, and quantity delta in an inventory history log.
6. THE Inventory_Manager SHALL support tracking item expiry dates and surface expiring-soon alerts.
7. THE Inventory_Manager SHALL support recording waste events with item, quantity, reason, and cost impact.
8. THE Inventory_Manager SHALL support inter-location stock transfers for multi-location tenants.
9. THE Inventory_Manager SHALL support barcode scanning for stock receiving and adjustment workflows.
10. THE Inventory_Manager SHALL provide demand forecasting to suggest reorder quantities based on historical consumption data.
11. FOR ALL inventory quantity updates, THE Inventory_Manager SHALL persist a before-and-after snapshot in the audit log (round-trip property: record → audit log → reconstructible state).

---

### Requirement 7: Staff Management

**User Story:** As an HR manager, I want a staff management module, so that I can manage employees, schedule shifts, track attendance, and review performance.

#### Acceptance Criteria

1. THE Staff_Manager SHALL support CRUD operations for employee records including name, role, contact, hire date, and assigned location.
2. THE Staff_Manager SHALL enforce the RBAC role hierarchy: admin > manager > cashier > kitchen > waiter > customer.
3. THE Staff_Manager SHALL support creating and publishing weekly shift schedules with per-employee assignments.
4. THE Staff_Manager SHALL support recording clock-in and clock-out events for attendance tracking.
5. THE Staff_Manager SHALL generate a payroll summary report showing hours worked, hourly rate, and gross pay per employee per period.
6. THE Staff_Manager SHALL support submitting and approving or rejecting leave requests.
7. THE Staff_Manager SHALL support assigning tasks to employees with due dates and completion tracking.
8. THE Staff_Manager SHALL display performance metrics per employee including average orders handled and customer satisfaction ratings.

---

### Requirement 8: Customer Management & Loyalty

**User Story:** As a manager, I want a customer management module with a loyalty program, so that I can build lasting relationships and reward repeat guests.

#### Acceptance Criteria

1. THE Customer_Manager SHALL support CRUD operations for customer profiles including name, email, phone, birthday, notes, and marketing preferences.
2. THE Customer_Manager SHALL display a customer's full order history with total spend, visit frequency, and average order value.
3. THE Customer_Manager SHALL support a tiered loyalty program with configurable point earn rates per currency unit spent.
4. WHEN a customer completes an order, THE System SHALL award loyalty points and update the customer's tier.
5. THE Customer_Manager SHALL support creating and distributing discount coupons with expiry dates and usage limits.
6. THE Customer_Manager SHALL surface birthday reminders for customers whose birthday falls within the next 7 days.
7. WHEN a customer reaches a new loyalty tier (e.g., Silver, Gold, Platinum), THE System SHALL trigger an automated notification to the customer.

---

### Requirement 9: Reservations & Waitlist

**User Story:** As a host, I want a reservation and waitlist management module, so that I can manage table bookings, walk-ins, and guest seating capacity.

#### Acceptance Criteria

1. THE Reservation_Manager SHALL support creating reservations with guest name, contact, party size, date, time, table assignment, and special requests.
2. THE Reservation_Manager SHALL display reservations in a calendar view with day, week, and month perspectives.
3. THE Reservation_Manager SHALL enforce capacity constraints so that a table cannot be double-booked for overlapping time slots.
4. THE Reservation_Manager SHALL support adding walk-in guests to a waitlist with estimated wait times.
5. WHEN a reservation is created or confirmed, THE System SHALL send an SMS or email confirmation to the guest if contact details are provided.
6. WHEN a reservation is within 24 hours of the booking time, THE System SHALL send an automated reminder to the guest.
7. THE Reservation_Manager SHALL maintain a guest visit history accessible from the customer profile.

---

### Requirement 10: Online Ordering

**User Story:** As a customer, I want to browse the menu, build a cart, and place an order for pickup or delivery online, so that I can order without visiting the restaurant.

#### Acceptance Criteria

1. THE System SHALL provide a publicly accessible menu browsing page with search, category filtering, and item details.
2. THE System SHALL support adding items with customizations to a persistent cart without requiring account creation (guest checkout).
3. THE System SHALL support order placement for Pickup and Delivery fulfillment types.
4. WHEN a delivery order is placed, THE System SHALL capture a delivery address and estimated delivery time.
5. THE System SHALL support QR code-based table ordering where scanning the QR code pre-fills the table number for the order.
6. WHEN an online order is placed, THE System SHALL create the order in the database, route it to the KDS, and display a real-time order tracking timeline to the customer.
7. THE System SHALL support online payment processing through a configurable payment provider.
8. WHEN an online order status changes, THE System SHALL push a real-time status update to the customer's order tracking view.

---

### Requirement 11: Analytics & Reporting

**User Story:** As a business owner, I want a comprehensive analytics module, so that I can understand revenue, costs, trends, and performance to make informed decisions.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute and display Revenue, Expenses, Gross Profit, Food Cost percentage, and Waste Cost for configurable date ranges.
2. THE Analytics_Engine SHALL display a sales trend chart showing daily revenue over the selected period.
3. THE Analytics_Engine SHALL identify peak hours by computing average order volume per hour of day across the selected period.
4. THE Analytics_Engine SHALL calculate customer retention rate as the percentage of customers who ordered more than once within the period.
5. THE Analytics_Engine SHALL display Average Order Value, Repeat Purchase Rate, and Top 10 selling items for the selected period.
6. THE Analytics_Engine SHALL display staff performance metrics including orders handled and customer feedback scores per employee.
7. THE Analytics_Engine SHALL display current inventory valuation (quantity × cost price) per category.
8. THE Analytics_Engine SHALL support exporting any report as a CSV file.
9. THE Analytics_Engine SHALL display a demand forecast for the next 7 days based on historical trends.
10. FOR ALL analytics aggregations, THE Analytics_Engine SHALL produce results consistent with direct database summation (model-based correctness property).

---

### Requirement 12: AI Insights Engine

**User Story:** As an operations manager, I want AI-powered operational insights, so that I can receive proactive recommendations to reduce waste, optimize staffing, and grow revenue.

#### Acceptance Criteria

1. THE AI_Insights_Engine SHALL generate recommendations to reduce food waste by identifying high-waste items and suggesting preparation adjustments.
2. THE AI_Insights_Engine SHALL generate staffing optimization recommendations by analyzing peak-hour patterns and current shift schedules.
3. THE AI_Insights_Engine SHALL predict demand for the next business day based on historical order data, day of week, and seasonal trends.
4. THE AI_Insights_Engine SHALL surface pricing suggestions for low-margin items based on cost data and competitor benchmarks.
5. THE AI_Insights_Engine SHALL generate promotional recommendations (e.g., happy hour timing, bundle deals) based on slow-period analysis.
6. THE AI_Insights_Engine SHALL display a confidence score (0–100%) for each recommendation.
7. WHEN an operator applies a recommendation, THE System SHALL log the action in the audit log with the recommendation ID and type.

---

### Requirement 13: Notification Center

**User Story:** As a staff member, I want a real-time notification center, so that I am immediately alerted to orders, low stock, reservations, and system events.

#### Acceptance Criteria

1. THE Notification_Center SHALL display notifications grouped by type: Orders, Inventory, Reservations, Staff, Payments, Kitchen, and System Alerts.
2. WHEN a new notification arrives, THE Notification_Center SHALL show an unread badge count on the notification bell icon.
3. THE Notification_Center SHALL support marking individual notifications or all notifications as read.
4. THE Notification_Center SHALL persist notifications in the database and load them on page mount via the existing `/api/notifications` endpoint.
5. WHEN the notification panel is open, THE Notification_Center SHALL subscribe to real-time updates and prepend new notifications without requiring a manual refresh.
6. THE Notification_Center SHALL surface critical alerts (low stock, failed payment) with a distinct visual treatment including a red badge and alert icon.

---

### Requirement 14: Global Search

**User Story:** As a staff member, I want a global search bar, so that I can instantly find orders, customers, inventory items, products, employees, reservations, and reports.

#### Acceptance Criteria

1. THE Global_Search SHALL search across Orders, Customers, Inventory items, Products, Employees, Reservations, Tables, and Reports simultaneously.
2. WHEN a user types a query of at least 2 characters, THE Global_Search SHALL display grouped results within 300ms for in-memory data and within 1 second for database queries.
3. THE Global_Search SHALL group results by entity type with a count badge per group.
4. WHEN a search result is selected, THE Global_Search SHALL navigate to the corresponding detail view for that entity.
5. THE Global_Search SHALL be accessible via a keyboard shortcut (Cmd/Ctrl + K) and closeable with Escape.

---

### Requirement 15: Settings

**User Story:** As an admin, I want a settings module, so that I can configure organization details, taxes, currencies, payment providers, printing, email, and security policies.

#### Acceptance Criteria

1. THE System SHALL provide a Settings module with sections for: Organization, Locations, Branding, Themes, Taxes & Currency, Languages, Kitchen Settings, Payment Providers, Printer Setup, Email, SMS, API Keys, and Security.
2. THE System SHALL allow configuring tax rates per location with a name, percentage, and applicability rule (inclusive or exclusive).
3. THE System SHALL allow selecting the default currency and locale for price formatting per tenant.
4. THE System SHALL allow uploading a logo and configuring brand colors that are applied to customer-facing pages.
5. THE System SHALL allow generating and revoking API keys for third-party integrations with scoped permissions.
6. WHEN a setting is saved, THE System SHALL write an audit log entry identifying the user, the setting key changed, and the before/after values.

---

### Requirement 16: Multi-Location Support

**User Story:** As a restaurant group owner, I want multi-location support, so that I can manage multiple restaurant branches from a single account with shared and separate data.

#### Acceptance Criteria

1. THE System SHALL support creating multiple Locations under a single Tenant with individual names, addresses, and operating hours.
2. WHEN a user switches Location context in the sidebar, THE System SHALL scope all data queries (orders, inventory, staff, analytics) to the selected Location.
3. THE System SHALL allow sharing inventory across Locations with inter-location transfer support.
4. THE System SHALL generate separate analytics reports per Location and a consolidated roll-up report across all Locations.
5. THE System SHALL enforce Location-scoped permissions so that a manager of Location A cannot access data from Location B unless granted cross-location access.

---

### Requirement 17: Authentication & Security

**User Story:** As an admin, I want secure, flexible authentication with RBAC and audit capabilities, so that access to the platform is controlled and traceable.

#### Acceptance Criteria

1. THE Auth_System SHALL support Email/Password login, Google OAuth, and Magic Link authentication via Supabase Auth.
2. THE Auth_System SHALL support optional Two-Factor Authentication (TOTP) for admin and manager roles.
3. THE Auth_System SHALL enforce RBAC by checking the user's role against the required roles before serving any protected API route or UI section.
4. WHEN an unauthenticated request reaches a protected route, THE Auth_System SHALL return a 401 response.
5. WHEN an authenticated user lacks the required role, THE Auth_System SHALL return a 403 response.
6. THE Auth_System SHALL maintain a session with secure, HttpOnly, SameSite=Strict cookies.
7. THE Auth_System SHALL write an audit log entry for every sign-in, sign-out, role change, and permission escalation event.
8. THE System SHALL implement CSRF protection on all state-changing API endpoints.
9. THE System SHALL sanitize all user inputs to prevent XSS injection before persisting or rendering them.
10. THE System SHALL apply rate limiting of 100 requests per minute per IP on all public-facing API routes.

---

### Requirement 18: REST API

**User Story:** As a developer integrating with Vador OS, I want a consistent, well-structured REST API, so that I can build third-party integrations reliably.

#### Acceptance Criteria

1. THE System SHALL expose REST API endpoints using a consistent response envelope: `{ data, error, meta }` for all routes.
2. WHEN a request payload fails validation, THE System SHALL return a 422 response with a structured error listing field names and messages.
3. THE System SHALL support pagination on all list endpoints using `page` and `pageSize` query parameters with a `meta.total` count in the response.
4. THE System SHALL support filtering on list endpoints using field-value query parameters (e.g., `?status=pending`).
5. THE System SHALL support sorting on list endpoints using `sortBy` and `sortDir` (asc/desc) query parameters.
6. THE System SHALL include a `/api/health` endpoint returning `{ status: "ok", timestamp }` for uptime monitoring.
7. WHEN any unhandled server error occurs, THE System SHALL return a 500 response with a generic error message and log the full error internally without exposing stack traces to the client.

---

### Requirement 19: Database Schema

**User Story:** As a backend developer, I want a normalized, index-optimized database schema with soft deletes and audit history, so that data integrity is maintained and queries are performant.

#### Acceptance Criteria

1. THE System SHALL use the existing Supabase schema as a foundation and extend it with new tables for: menu_items, menu_categories, menu_variants, menu_modifiers, suppliers, purchase_orders, purchase_order_items, employees, shifts, attendance_logs, customers, loyalty_points, reservations, waitlist_entries, locations.
2. ALL new tables SHALL include `id` (UUID primary key), `tenant_slug` (foreign key to tenants), `created_at`, and `updated_at` timestamps.
3. ALL new tables SHALL include a `deleted_at` timestamptz column (nullable) to support Soft_Delete; queries SHALL filter `deleted_at IS NULL` by default.
4. THE System SHALL define appropriate foreign key constraints and cascade rules between related tables.
5. THE System SHALL create database indexes on all foreign key columns, status/type enum columns, and `created_at` for tables expected to grow beyond 10,000 rows.
6. THE System SHALL enforce Row Level Security policies on all new tables using the tenant_slug claim from the JWT.

---

### Requirement 20: Performance

**User Story:** As a user, I want the platform to load and respond quickly, so that operations are never blocked by slow software.

#### Acceptance Criteria

1. THE System SHALL achieve a Lighthouse Performance score of 90 or above on the Dashboard page under simulated 4G conditions.
2. THE System SHALL implement dynamic imports and code splitting for all page-level components to reduce initial bundle size.
3. THE System SHALL apply React.memo or useMemo for computationally expensive widget calculations to prevent unnecessary re-renders.
4. THE System SHALL serve optimized image formats (WebP) with explicit width and height attributes using Next.js Image optimization.
5. THE System SHALL implement stale-while-revalidate caching for API responses with appropriate cache headers.
6. WHEN a list exceeds 50 items, THE System SHALL implement virtual scrolling or server-side pagination to avoid rendering large DOM trees.

---

### Requirement 21: Accessibility

**User Story:** As a user with accessibility needs, I want the platform to be fully usable with keyboard and assistive technology, so that I am not excluded from any workflow.

#### Acceptance Criteria

1. THE System SHALL meet WCAG 2.1 AA accessibility standards across all pages and components.
2. THE System SHALL support full keyboard navigation through all interactive elements using Tab, Enter, Space, Arrow keys, and Escape.
3. ALL form inputs, buttons, and interactive elements SHALL have visible focus indicators meeting a 3:1 contrast ratio.
4. ALL images SHALL include descriptive `alt` attributes; decorative images SHALL use `alt=""`.
5. ALL modals, drawers, and dialogs SHALL trap focus within the component when open and restore focus to the trigger when closed.
6. THE System SHALL provide ARIA `role`, `aria-label`, `aria-expanded`, `aria-live`, and `aria-describedby` attributes where native HTML semantics are insufficient.

---

### Requirement 22: Animations & Micro-interactions

**User Story:** As a user, I want smooth, purposeful animations throughout the interface, so that interactions feel responsive and polished.

#### Acceptance Criteria

1. THE System SHALL use Framer Motion for all page transitions with a consistent enter/exit animation pattern (fade + translate Y).
2. THE System SHALL apply card hover lift animations (translateY -2px, subtle gold border glow) using the existing `.glass-panel-hover` utility.
3. THE System SHALL animate drawer and modal open/close with spring physics transitions (Framer Motion spring damping: 25, stiffness: 200).
4. THE System SHALL render loading skeleton shimmer animations for all data-dependent widgets while data is being fetched.
5. THE System SHALL animate metric card value changes with a count-up transition when data refreshes.
6. WHEN animations are disabled via the OS `prefers-reduced-motion` setting, THE System SHALL skip or minimize all non-essential animations.

---

### Requirement 23: Mobile Experience

**User Story:** As a staff member using a tablet or phone, I want a fully responsive and touch-friendly interface, so that I can operate the system on any device.

#### Acceptance Criteria

1. THE System SHALL render all pages correctly at viewport widths from 320px (phone) to 1920px (wide desktop).
2. THE System SHALL replace hover-only interactions with tap-friendly equivalents on touch devices.
3. THE System SHALL collapse the sidebar to a bottom navigation bar or hamburger drawer on viewports below 768px.
4. THE POS_Terminal and KDS SHALL support touch-based drag-and-drop on tablet-sized screens.
5. ALL tap targets SHALL be at least 44×44 CSS pixels in size to meet touch accessibility guidelines.

---

### Requirement 24: Error Handling & Resilience

**User Story:** As a user, I want clear error messages and graceful recovery options, so that I can resolve problems without losing work.

#### Acceptance Criteria

1. THE System SHALL wrap the root layout with a React Error Boundary that catches unhandled client-side errors and renders a user-friendly fallback UI with a retry action.
2. THE System SHALL render custom 404 (not found) and 500 (server error) pages consistent with the design system.
3. WHEN the browser is offline, THE System SHALL display an offline state banner and queue any write operations for retry when connectivity is restored.
4. WHEN a network request fails, THE System SHALL display a contextual error message within the affected widget or form and provide a retry button.
5. WHEN a list or section has no data, THE System SHALL render a descriptive empty state component with an illustration and a call-to-action.

---

### Requirement 25: Code Quality & Architecture

**User Story:** As a developer maintaining this codebase, I want clean, well-organized code following consistent patterns, so that I can build and debug features efficiently.

#### Acceptance Criteria

1. THE System SHALL organize source code in a feature-based folder structure: `src/features/{feature}/` containing components, hooks, types, and API clients for each domain.
2. THE System SHALL extract reusable presentational components into `src/components/ui/` to avoid duplication across features.
3. THE System SHALL define all shared TypeScript interfaces and types in `src/types/` and import them consistently across modules.
4. ALL API calls to Supabase from the client SHALL be made through React Query hooks defined in `src/features/{feature}/hooks/`.
5. THE System SHALL enforce consistent naming conventions: PascalCase for components, camelCase for functions and variables, SCREAMING_SNAKE_CASE for constants, and kebab-case for file names.
6. THE System SHALL include unit tests for all pure utility functions, integration tests for all API routes, and at minimum one end-to-end smoke test per major feature page.
7. IF the same data-fetching logic or transformation appears in more than one component, THE System SHALL extract it into a shared custom hook or utility function to eliminate duplication.

---

### Requirement 26: Testing Strategy

**User Story:** As a developer, I want comprehensive test coverage across unit, integration, and property-based dimensions, so that regressions are caught automatically.

#### Acceptance Criteria

1. THE System SHALL include unit tests using Vitest for all analytics utility functions in `src/lib/analytics.ts`.
2. FOR ALL analytics aggregation functions, a property-based test SHALL verify that aggregating a randomly generated set of orders and then summing the result equals the direct sum of all order amounts (round-trip invariant).
3. THE System SHALL include integration tests for all API route handlers using a test Supabase instance or mock.
4. THE System SHALL include accessibility tests using `@testing-library/react` and `axe-core` for all major page components.
5. THE System SHALL achieve a minimum of 80% line coverage on the `src/lib/` utility modules.
6. FOR ALL parser and serializer utilities (e.g., receipt formatting, report export), THE System SHALL include a round-trip property test verifying `parse(format(x))` produces an equivalent value.
