import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(1),
  price: z.number().min(0),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createOrderSchema = z.object({
  tenant_slug: z.string().min(1).optional(),
  customer_id: z.string().optional(),
  table_number: z.string().min(1),
  items: z.array(orderItemSchema).nonempty(),
  notes: z.string().max(1000).optional(),
});

export const inventoryUpdateSchema = z.object({
  item_id: z.string().min(1),
  quantity_delta: z.number(),
});

export const notificationSchema = z.object({
  tenant_slug: z.string().min(1).optional(),
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(600),
  type: z.enum(['alert', 'order', 'system', 'insight']),
});

export const locationSchema = z.object({
  tenant_slug: z.string().min(1).optional(),
  name: z.string().min(1).max(150),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  timezone: z.string().min(1).max(64).optional(),
  operating_hours: z.record(z.string(), z.any()).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const locationUpdateSchema = locationSchema.partial().extend({
  id: z.string().min(1).optional(),
});
