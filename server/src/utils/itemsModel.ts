import { z } from 'zod';

/**
 * Valid UUID format
 */
const uuidSchema = z.uuid('Invalid UUID format');

export const itemIdParamSchema = z.object({
  id: uuidSchema,
});

export const productIdParamSchema = z.object({
  productId: uuidSchema,
});

export const locationIdParamSchema = z.object({
  locationId: uuidSchema,
});

/**
 * Valid status values for items
 */
export const ItemStatus = z.enum(['active', 'inactive', 'discontinued', 'checked_out']);

/**
 * Schema for validating item creation
 * Requires: product_id, quantity, current_location_id, status, created_by
 */
export const createItemSchema = z.object({
  product_id: uuidSchema,
  current_location_id: uuidSchema,
  created_by: uuidSchema,
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  status: ItemStatus,
});

/**
 * Schema for validating item updates
 * All fields are optional, but at least one must be provided
 */
export const updateItemSchema = z
  .object({
    product_id: z.uuid().optional(),
    quantity: z.number().int().nonnegative('Quantity cannot be negative').optional(),
    current_location_id: z.uuid().optional(),
    status: ItemStatus.optional(),
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
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemStatusType = z.infer<typeof ItemStatus>;
