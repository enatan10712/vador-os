-- Migration: 001_enums.sql
-- Creates all new enum types for Vador OS production schema
-- Requirement: 19.1

DO $$
BEGIN

  -- fulfillment_type: how an order is fulfilled
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_type') THEN
    CREATE TYPE fulfillment_type AS ENUM ('dine_in', 'takeaway', 'delivery');
  END IF;

  -- payment_method: method used to pay
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'digital_wallet');
  END IF;

  -- priority_label: order or customer priority level
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_label') THEN
    CREATE TYPE priority_label AS ENUM ('normal', 'urgent', 'vip');
  END IF;

  -- kds_status: kitchen display system item status
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kds_status') THEN
    CREATE TYPE kds_status AS ENUM ('new', 'preparing', 'ready', 'served');
  END IF;

  -- purchase_status: status of a purchase/supply order
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
    CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
  END IF;

  -- shift_status: employee shift lifecycle
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
    CREATE TYPE shift_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
  END IF;

  -- reservation_status: table reservation lifecycle
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'seated', 'cancelled', 'no_show');
  END IF;

  -- loyalty_tier: customer loyalty programme tier
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
    CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  END IF;

  -- coupon_type: discount coupon calculation method
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
    CREATE TYPE coupon_type AS ENUM ('percent', 'fixed');
  END IF;

  -- transfer_status: inter-location stock transfer lifecycle
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
    CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');
  END IF;

END $$;
