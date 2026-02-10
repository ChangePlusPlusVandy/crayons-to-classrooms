import { z } from 'zod';

/**
 * Valid UUID format
 */
const uuidSchema = z.uuid('Invalid UUID format');

export const itemIdParamSchema = z.object({
  id: uuidSchema,
});

export const nameParamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
});

export const productIdParamSchema = z.object({
  productId: uuidSchema,
});

export const locationIdParamSchema = z.object({
  locationId: uuidSchema,
});

export const warehouseIdParamSchema = z.object({
  warehouseId: uuidSchema,
});

/**
 * Valid status values for items
 */
export const ItemStatus = z.enum(['active', 'inactive', 'discontinued', 'checked_out']);

/**
 * Schema for validating item creation
 * Requires: name, product_id, quantity, status, created_by, warehouse, value
 * Optional: current_location_id, stock
 */
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  product_id: uuidSchema,
  current_location_id: uuidSchema.optional(),
  created_by: uuidSchema,
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional(),
  status: ItemStatus,
  warehouse: uuidSchema,
  category: z.string().optional(),
  item_limit: z.number().int().nonnegative('Limit cannot be negative').optional(),
  value: z.number().nonnegative('Value cannot be negative'),
  limbo: z.boolean().default(false),
  notes: z.string().optional(),
});

/**
 * Schema for validating bulk item creation
 * Requires: same fields as createItemSchema plus count
 */
export const createItemsBulkSchema = createItemSchema.extend({
  count: z.number().int().positive('Count must be a positive integer'),
});

/**
 * Schema for validating item updates
 * All fields are optional, but at least one must be provided
 */
export const updateItemSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    product_id: uuidSchema.optional(),
    quantity: z.number().int().nonnegative('Quantity cannot be negative').optional(),
    stock: z.number().int().nonnegative('Stock cannot be negative').optional(),
    current_location_id: uuidSchema.optional(),
    status: ItemStatus.optional(),
    warehouse: uuidSchema.optional(),
    category: z.string().optional(),
    item_limit: z.number().int().nonnegative('Limit cannot be negative').optional(),
    value: z.number().nonnegative('Value cannot be negative').optional(),
    limbo: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for validating status query parameter
 */
export const statusQuerySchema = z.object({
  status: ItemStatus,
});

/**
 * Type exports for TypeScript
 */
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type CreateItemsBulkInput = z.infer<typeof createItemsBulkSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemStatusType = z.infer<typeof ItemStatus>;
