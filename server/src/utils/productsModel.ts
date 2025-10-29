import { z } from 'zod';

// Validation schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  value: z.number().positive('Value must be a positive number'),
  item_limit: z.number().int().nonnegative('Item limit must be a non-negative integer'),
  category: z.string().optional(),
  total_count: z.number().int().nonnegative('Total count must be a non-negative integer').default(0),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    unit_of_measure: z.string().min(1).optional(),
    value: z.number().positive().optional(),
    item_limit: z.number().int().nonnegative().optional(),
    category: z.string().optional(),
    total_count: z.number().int().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
});

export const productNameParamSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
});

export const productDescriptionParamSchema = z.object({
  description: z.string().min(1, 'Description search term is required'),
});

// TypeScript types
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;