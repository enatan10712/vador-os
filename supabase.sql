-- Supabase schema for Vador OS restaurant SaaS

-- Enums
create type user_role as enum ('admin', 'manager', 'cashier', 'kitchen', 'waiter', 'customer');
create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');
create type order_status as enum ('pending', 'preparing', 'completed', 'cancelled');
create type notification_type as enum ('alert', 'order', 'system', 'insight');

-- Tenants
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Profiles
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  tenant_slug text not null references tenants(slug) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  email text,
  created_at timestamptz default now()
);

create index profiles_tenant_slug_idx on profiles(tenant_slug);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_slug text not null references tenants(slug) on delete cascade,
  customer_id uuid,
  table_number text not null,
  total_amount numeric(12,2) not null,
  status order_status not null default 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

create index orders_tenant_slug_created_at_idx on orders(tenant_slug, created_at desc);

-- Order items
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null check (price >= 0),
  metadata jsonb,
  created_at timestamptz default now()
);

create index order_items_order_id_idx on order_items(order_id);

-- Inventory
create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_slug text not null references tenants(slug) on delete cascade,
  name text not null,
  sku text not null,
  quantity integer not null default 0,
  unit text not null default 'unit',
  threshold integer not null default 10,
  status stock_status not null default 'in_stock',
  metadata jsonb,
  updated_at timestamptz default now()
);

create index inventory_items_tenant_slug_idx on inventory_items(tenant_slug);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_slug text not null references tenants(slug) on delete cascade,
  title text not null,
  description text not null,
  type notification_type not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

create index notifications_tenant_slug_idx on notifications(tenant_slug);

-- Audit logs
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_slug text not null references tenants(slug) on delete cascade,
  user_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

create index audit_logs_tenant_slug_idx on audit_logs(tenant_slug);

-- RLS and policy examples
alter table profiles enable row level security;
create policy tenant_profile_access on profiles
  for select using (tenant_slug = current_setting('request.jwt.claims.tenant_slug', true));

alter table orders enable row level security;
create policy tenant_order_access on orders
  for select using (tenant_slug = current_setting('request.jwt.claims.tenant_slug', true));

alter table inventory_items enable row level security;
create policy tenant_inventory_access on inventory_items
  for select using (tenant_slug = current_setting('request.jwt.claims.tenant_slug', true));

alter table notifications enable row level security;
create policy tenant_notification_access on notifications
  for select using (tenant_slug = current_setting('request.jwt.claims.tenant_slug', true));

alter table audit_logs enable row level security;
create policy tenant_audit_access on audit_logs
  for select using (tenant_slug = current_setting('request.jwt.claims.tenant_slug', true));
