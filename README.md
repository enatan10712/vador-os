# Vador OS — Enterprise Restaurant Operating System (ERP)

Vador OS is a Next.js 15 & Python Django-powered enterprise restaurant operating system (ERP) tailored for high-frequency workflows. It supports point-of-sale (POS) terminal transactions, real-time kitchen display (KDS), automated inventory tracking, floating AI assistant querying, and rich analytical dashboards.

This application is fully migrated to a robust Django backend and is highly optimized to run both locally and online via a **Vercel (Free Tier)** serverless deployment.

---

## 🏗️ Enterprise Architecture Overview

The system features an enterprise-grade separated architecture:
- **Frontend**: Next.js 15 (App Router) utilizing React 19, Tailwind CSS, Zustand, React Query, and Framer Motion.
- **Backend**: Python Django with Django REST Framework, implementing transaction-safe models, database locks, structured JSON logging, and multi-tenant isolation.
- **CSRF-Secure Next.js Django Proxy**: Standard-compliant secure proxy middleware under `src/lib/djangoProxy.ts` that safely extracts, sanitizes, and forwards `csrftoken` cookies as `X-CSRFToken` to satisfy Django's strict `SessionAuthentication` and secure referer checking over HTTPS.
- **Enterprise Domain Services**: High-performance core domain logic inside `django_backend/api/services.py`:
  - `POSTransactionService`: Thread-safe database transactions and row-level locks (`select_for_update()`) during POS stock deduction.
  - `InventoryManagementService`: Centralized inventory adjustments, reorders, and stock checks.
  - `AINaturalLanguageService`: Light-weight natural language query service supporting live transactional analysis.

---

## ✨ Features Implemented

- **Multi-Tenant Isolation**: Secure data isolation enforced at the Django ORM layer using custom query managers and middleware. Requests are scoped by active tenant (`X-Tenant-Slug`).
- **Interactive POS Terminal Workspace**:
  - Spacious, premium 2-column configuration panel (Stripe/Apple-inspired styling).
  - Multi-currency support (ETB, USD, EUR) with real-time conversion.
  - Localized Ethiopian taxation models (15% VAT & 2% TOT).
  - Multi-way bill-splitting with proportional checkout totals.
  - High-fidelity printable receipts complying with Ethiopian Revenue Authority (ERA) standards, equipped with simulated QR verification links.
- **Vador AI Co-Pilot Floating Assistant**:
  - Globally-accessible floating side chat drawer that allows operators to run natural language database queries (e.g. "Show today's revenue" or "What ingredients will finish tomorrow?") in English and Amharic.
- **Atomic POS & Inventory Checkout**: Utilizes database-level locking (`select_for_update()`) within `transaction.atomic()` blocks to eliminate race conditions and double stock deductions during rapid POS checkout.
- **Offline Mode & Reconciliation**: A robust `/api/sync/` endpoint processes queue-sequenced transactions captured offline, safely avoiding duplicate stock/order entries.
- **Immutable Audit Logging**: System actions are saved in an immutable ledger (updates and deletions are strictly blocked at the database model layer).
- **Near-Realtime KDS & POS**: Automatic UI status updates via optimized React Query polling (refetch interval set to 3s), avoiding complex WebSocket overhead.
- **Enterprise Analytics & AI Recommendations**: Computes 16 performance metrics and generates 12 smart business recommendations using Django aggregates and historical trends.
- **Enterprise Supply Chain Suite (2026)**:
  - **Ingredient Management**: Comprehensive inventory details including SKUs, barcodes, QR codes, storage specs (shelf/bin/rack), par levels, and supplier links.
  - **Advanced Purchase Order Lifecycle**: Draft -> Submitted -> Approved -> Ordered -> Partially Received -> Received with automated weighted average costing and batch/lot allocation.
  - **Goods & Recipe Costings**: Plate recipes linking menu items to complex sub-ingredients with waste loss calculations and auto-deduction upon POS sales checkout.
  - **Stock Transfers & Adjustments**: Inter-location logistics and manual adjustments with strict auditing and approval stages.
  - **AI supply chain analysis**: Demand forecasting, shrinkage warnings, dead stock prediction, and cost-saving suggests.
  - **Barcode and Label System**: Scanner lookup matching SKUs/barcodes/QR codes.

---

## 🛠️ Local Development Setup

Follow these steps to run both the Django backend and Next.js frontend locally.

### 🐍 Step 1: Django Backend Setup

Navigate to the `django_backend` directory to initialize the database:

1. **Navigate to backend**:
   ```bash
   cd django_backend
   ```

2. **Install Python dependencies**:
   Ensure you have Python 3.12+ installed. Run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run database migrations**:
   Apply migrations to initialize the SQLite database:
   ```bash
   python manage.py migrate
   ```

4. **Seed database with rich historical data**:
   Run the seed script to create multi-tenant restaurants (`robusta-coffee`, `sidama-roasters`), user accounts (admin, manager, kitchen, etc.), menu items, inventory, and historical transaction logs:
   ```bash
   python seed_data.py
   ```

5. **Start Django local server**:
   ```bash
   python manage.py runserver
   ```
   The backend will start on: **`http://127.0.0.1:8000`**

---

### ⚛️ Step 2: Next.js Frontend Setup

From the repository root directory:

1. **Install Node packages**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   DJANGO_BACKEND_URL=http://127.0.0.1:8000
   ```

3. **Start Next.js local server**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3000`** in your browser.

---

## 🧪 Running Tests

To ensure code stability and track regressions, tests are available for both the frontend and backend.

### 1. Run Django Backend Tests
Navigate to the root directory and run:
```bash
python django_backend/manage.py test api
```

### 2. Run Next.js Frontend Tests (Vitest)
```bash
npm run test
```

---

## 🚀 Vercel & Production Deployment

### 1. Next.js Frontend (Vercel)
Vador OS is fully optimized for Vercel's Free Tier:
- Push your project repository to GitHub.
- Import the repository into your Vercel Dashboard.
- Set the following environment variable in the Vercel project settings:
  - `DJANGO_BACKEND_URL`: URL of your deployed online Django backend (e.g., `https://api.vador.live` or your Render/Railway/Fly.io URL).
- Deploy!

### 2. Django Backend (Render / Railway / Fly.io)
- Deploy the `django_backend` folder to your provider of choice.
- Ensure `ALLOWED_HOSTS` or CORS settings in `settings.py` permit incoming requests from your Vercel deployment URL.
