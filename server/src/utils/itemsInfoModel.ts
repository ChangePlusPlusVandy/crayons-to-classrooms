import { z } from 'zod';

/**
 * Valid UUID format
 */
const uuidSchema = z.uuid('Invalid UUID format');

export const itemInfoIdParamSchema = z.object({
  id: uuidSchema,
});

export const nameParamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
});


/**
 * Schema for validating item creation
 * Requires: name, item_limit, stock, last_known_fixture, last_known_location_code, time_last_updated, notes
 */
export const createItemInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  item_limit: z.number().int().nonnegative('Limit cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  last_known_fixture: z.string().optional(),
  last_known_location_code: z.string(),
  time_last_updated: z.string(),
  notes: z.string().optional(),
});

/**
 * Schema for validating item updates
 * All fields are optional, but at least one must be provided
 */
export const updateItemInfoSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
    item_limit: z.number().int().nonnegative('Limit cannot be negative').optional(),
    stock: z.number().int().nonnegative('Stock cannot be negative').optional(),
    last_known_fixture: z.string().optional(),
    last_known_location_code: z.string().optional(),
    time_last_updated: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });



/**
 * Type exports for TypeScript
 */
export type CreateItemInfoInput = z.infer<typeof createItemInfoSchema>;
export type UpdateItemInfoInput = z.infer<typeof updateItemInfoSchema>;
