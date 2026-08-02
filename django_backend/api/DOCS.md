# Vador OS — Enterprise Architectural & Deployment Guide (2026)

This document details the production-grade, highly scalable, and localized software architecture powering **Vador OS**, the leading cloud-native Restaurant Operating System (ERP) designed for global and East African markets.

---

## 1. Clean Architecture & DDD Separation

Vador OS implements a clean, layered architecture separating business domain entities, persistent database models, and view controllers through a highly cohesive **Service Layer**.

```
┌─────────────────────────────────────────────────────────┐
│                    API View Controllers                 │
│         (views.py, urls.py, Next.js Proxy Routes)        │
└────────────────────────────┬────────────────────────────┘
                             │ (Calls)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Domain Service Layer                 │
│        (services.py — POSTransaction, Inventory)        │
└────────────────────────────┬────────────────────────────┘
                             │ (Mutates / Validates)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Enterprise Models                   │
│         (models.py — Tenant Isolation Manager)          │
└─────────────────────────────────────────────────────────┘
```

### Domain Services Overview
- **`POSTransactionService`**: Orchestrates order processing, applies database locks (`select_for_update()`) inside transaction blocks to eliminate race conditions, manages split bill divisor computation, and triggers inventory recipe ingredient deductions.
- **`InventoryManagementService`**: Standardizes programmatic stock level updates, handles manual or automated adjustments, computes variance ratios during cycle counts, and formats immutable audit logs.
- **`AINaturalLanguageService`**: Analyzes multi-lingual phrases (English/Amharic) via pattern classification and performs optimized SQL aggregations to return real-time metrics dynamically.

---

## 2. ER Database Schema

Below is the structured relational outline of our enterprise Django model graph:

```
+--------------------+         +--------------------+         +---------------------+
|     Restaurant     | <------ |  RestaurantStaff   | ------> |      auth.User      |
| (Tenant Account)   |         |  (Role-Based RBAC) |         | (Credentials/Admin) |
+--------------------+         +--------------------+         +---------------------+
          ^                                                              ^
          | (Scopes)                                                     | (OneToOne)
          +-----------------------------+                                v
          |                             |                     +---------------------+
          v                             v                     |   CustomerProfile   |
+--------------------+         +--------------------+         | (Contact/Loyalty)   |
|      Location      |         |      Supplier      |         +---------------------+
| (Warehouse/Outlet) |         |  (Vendor Profile)  |                    ^
+--------------------+         +--------------------+                    |
          ^                             ^                                | (Optionally linked)
          |                             |                                v
          v                             v                     +---------------------+
+---------------------------------------------------+         |        Order        |
|                  InventoryItem                    | <------ |    (POS Checkout)   |
|   (SKU, Barcode, Weighted Average Cost, Storage)  |         +---------------------+
+---------------------------------------------------+                    |
     ^                      ^                       ^                    | (Contains)
     |                      |                       |                    v
     v                      v                       v         +---------------------+
+-----------------+   +-----------+   +-------------------+   |      OrderItem      |
| InventoryBatch  |   | RecipeIng |   | InventoryTransact |   |  (Kitchen Status)   |
|  (Lot, Expiry)  |   +-----------+   +-------------------+   +---------------------+
+-----------------+         ^
                            |
                            v
                      +-----------+
                      |  Recipe   | ---> (Linked to MenuItem)
                      +-----------+
```

---

## 3. Ethiopian Localization & Tax Compliance

Vador OS is fully adapted to the fiscal regulatory requirements of Ethiopia and East African commerce:

### 1. Unified Tax Invoicing
- **Value Added Tax (VAT)**: Configurable standard rate of **15%** computed dynamically upon checkout.
- **Turnover Tax (TOT)**: Alternate standard flat rate of **2%** for retail services under general thresh boundaries.
- **Fiscal Receipts**: The system outputs a standard invoice containing reference hashes, ERA device identifiers, breakdown lines, and a verifiable signature.

### 2. QR Code Verification System
- High-frequency POS checkouts render a cryptographic string payload in the visual receipt block.
- Scanning the receipt QR using the official Ethiopian Revenue Authority (ERA) verification platform validates database transaction compliance immediately.

### 3. Multi-Currency Capabilities
- Full dual-pricing formatting inside POS terminals, displaying exchange values across:
  - **ETB** (Ethiopian Birr - Base Currency)
  - **USD** (United States Dollar)
  - **EUR** (European Euro)

---

## 4. Multi-Tenant Row Level Security (RLS)

- **`TenantIsolationMiddleware`**: Intercepts inbound HTTP requests and binds the active restaurant (retrieved from `X-Tenant-Slug` headers, domains, or session cookies) to a thread-local context.
- **`TenantManager`**: Automatically overrides default Django ORM managers, ensuring that *all* database transactions are strictly isolated to the active tenant restaurant. This prevents unauthorized cross-tenant leakage of proprietary revenue, menus, or customer databases.

---

## 5. Security Architecture Matrix

Vador OS implements robust defenses matching modern security standards:
1. **OWASP Top 10 Mitigation**: Enforced CSRF tokens, strict Django SQL injection parameterized queries, and safe XSS output escaping.
2. **Immutable Audit Ledger**: Overridden `save()` and `delete()` methods on `AuditLog` models prevent modification or deletion of sensitive event records, assuring non-repudiation.
3. **Brute Force Protection**: Optional rate-limiting middlewares protect key endpoints (such as `/api/auth/login/`) from automated dictionary attacks.

---

## 6. DevOps & Production Deployment Checklist

### Docker Compose Cluster
For horizontal scaling on Railway, Fly.io, or Render, use this standard cluster topology:

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    command: gunicorn vador_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vador_db
      POSTGRES_USER: vador_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Zero-Downtime Deployments
- Deployments use rolling-updates (Blue-Green or Canary) to prevent network disconnection.
- Static assets are compiled and offloaded directly to a globally distributed CDN (e.g. Vercel Edge Networks, Cloudflare).
