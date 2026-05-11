import { z } from 'zod';

// Valid UUID format
const uuidSchema = z.uuid('Invalid UUID format');

export const storageLocationIdParamSchema = z.object({
  id: uuidSchema,
});

export const locationCodeParamSchema = z.object({
  locationCode: z.string().min(1, 'Location code cannot be empty'),
});

// Schema for validating storage location creation
export const createStorageLocationSchema = z.object({
  aisle: z.string().min(1, 'Aisle cannot be empty').nullable().optional(),
  slot: z.string().min(1, 'Slot cannot be empty'),
  fixture: z.string().nullable().optional(),
  active: z.boolean(),
  extra_info: z.string().nullable().optional(),
  warehouse_id: uuidSchema,
});

// Schema for validating storage location updates
export const updateStorageLocationSchema = z
  .object({
    aisle: z.string().min(1, 'Aisle cannot be empty').nullable().optional(),
    slot: z.string().min(1, 'Slot cannot be empty').optional(),
    fixture: z.string().nullable().optional(),
    active: z.boolean().optional(),
    extra_info: z.string().nullable().optional(),
    warehouse_id: uuidSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for validating slot parameter
export const slotParamSchema = z.object({
  slot: z.string().min(1, 'Slot cannot be empty'),
});

// Schema for validating browse query params for location-code listing
export const locationCodeBrowseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  warehouse: z.string().uuid().optional(),
  include_empty: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type CreateStorageLocationInput = z.infer<typeof createStorageLocationSchema>;
export type UpdateStorageLocationInput = z.infer<typeof updateStorageLocationSchema>;
export type LocationCodeBrowseQuery = z.infer<typeof locationCodeBrowseQuerySchema>;
