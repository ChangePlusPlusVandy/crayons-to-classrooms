import { z } from 'zod';

export const uuidSchema = z.uuid('Invalid UUID format');

// Param schemas
export const movementIdParamSchema = z.object({
  id: uuidSchema,
});

export const itemIdParamSchema = z.object({
  item_id: uuidSchema,
});

export const productIdParamSchema = z.object({
  product_id: uuidSchema,
});

export const startLocationIdParamSchema = z.object({
  start_location_id: uuidSchema,
});

export const endLocationIdParamSchema = z.object({
  end_location_id: uuidSchema,
});

export const performedByIdParamSchema = z.object({
  performed_by_id: uuidSchema,
});

export const performedDateParamSchema = z.object({
  date: z.coerce.date(),
});

// Validates action types for inventory movements
export const ActionParamSchema = z.enum(['ADD', 'MOVE', 'CHECKOUT', 'DISCARD', 'ADJUSTMENT']);

/**
 * Schema for inventory creation
 * Requires: inventory_action, item_id, product_id, from_location_id, to_location_id, quantity, performed_by
 */
export const createInventoryMovementSchema = z.object({
  inventory_action: ActionParamSchema,
  item_id: uuidSchema,
  product_id: uuidSchema,
  from_location_id: uuidSchema,
  to_location_id: uuidSchema,
  quantity: z.number().int().nonnegative('Quantity must be a positive integer'),
  performed_by: uuidSchema,
  note: z.string().optional(),
});

export const updateInventoryMovementSchema = z
  .object({
    inventory_action: ActionParamSchema.optional(),
    item_id: uuidSchema.optional(),
    product_id: uuidSchema.optional(),
    from_location_id: uuidSchema.optional(),
    to_location_id: uuidSchema.optional(),
    quantity: z.number().int().nonnegative('Quantity must be a positive integer').optional(),
    performed_by: uuidSchema,
    note: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for validating status query parameter
 */
export const actionQuerySchema = z.object({
  inventory_action: ActionParamSchema,
});

export type CreateInventoryInput = z.infer<typeof createInventoryMovementSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventoryMovementSchema>;
export type InventoryStatusType = z.infer<typeof actionQuerySchema>;
