import { z } from 'zod';
import { createItemSchema } from './itemsModel.js';

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
 * Requires: inventory_action, item_id, product_id, to_location_id, quantity, performed_by
 * from_location_id is optional (null for ADD actions)
 */
export const createInventoryMovementSchema = z.object({
  inventory_action: ActionParamSchema,
  item_id: uuidSchema,
  product_id: uuidSchema,
  from_location_id: uuidSchema.nullable().optional(),
  to_location_id: uuidSchema,
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  performed_by: uuidSchema,
  note: z.string().optional(),
});

export const updateInventoryMovementSchema = z
  .object({
    inventory_action: ActionParamSchema.optional(),
    item_id: uuidSchema.optional(),
    product_id: uuidSchema.optional(),
    from_location_id: uuidSchema.nullable().optional(),
    to_location_id: uuidSchema.optional(),
    quantity: z.number().int().nonnegative('Quantity must be a nonnegative integer').optional(),
    performed_by: uuidSchema.optional(),
    performed_at: z.coerce.date().optional(),
    note: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for validating inventory_action query parameter
 */
export const actionQuerySchema = z.object({
  inventory_action: ActionParamSchema,
});

/**
 * Schema for the movement portion of the combined create-item-with-movement endpoint.
 * item_id and product_id are omitted because they come from the newly created item.
 */
export const movementFieldsSchema = z.object({
  inventory_action: ActionParamSchema,
  from_location_id: uuidSchema.nullable().optional(),
  to_location_id: uuidSchema,
  quantity: z.number().int().nonnegative('Quantity must be a nonnegative integer'),
  performed_by: uuidSchema,
  note: z.string().optional(),
});

/**
 * Schema for the combined create-item-with-movement request body.
 */
export const createItemWithMovementSchema = z.object({
  item: createItemSchema,
  movement: movementFieldsSchema.extend({
    inventory_action: z.literal('ADD'),
  }),
});

/**
 * Schema for the edit-move endpoint request body.
 * No item creation needed — MOVE edits relocate existing items.
 */
export const editMoveSchema = z.object({
  from_location_id: uuidSchema,
  to_location_id: uuidSchema,
  product_id: uuidSchema,
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  performed_by: uuidSchema,
  note: z.string().optional(),
});

export type EditMoveInput = z.infer<typeof editMoveSchema>;

/**
 * Schema for the combined move-items-with-movement request body.
 * item_ids are the existing items to relocate; movement records the action.
 */
export const moveItemsWithMovementSchema = z.object({
  item_ids: z.array(uuidSchema).nonempty('At least one item_id is required'),
  movement: movementFieldsSchema.extend({
    inventory_action: z.literal('MOVE'),
  }),
});

export type CreateInventoryInput = z.infer<typeof createInventoryMovementSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventoryMovementSchema>;
export type InventoryStatusType = z.infer<typeof actionQuerySchema>;
export type CreateItemWithMovementInput = z.infer<typeof createItemWithMovementSchema>;
export type MovementIdParamType = z.infer<typeof movementIdParamSchema>;
export type MoveItemsWithMovementInput = z.infer<typeof moveItemsWithMovementSchema>;
