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
    aisle: z.string().min(1, 'Aisle cannot be empty'),
    fixture: z.string().min(1, 'Fixture cannot be empty'),
    location_code: z.string().min(1, 'Location code cannot be empty'),
    active: z.boolean(),
    extra_info: z.string().nullable().optional(),
    warehouse_id: uuidSchema,
  });

  // Schema for validating storage location updates
  export const updateStorageLocationSchema = z
  .object({
    aisle: z.string().min(1, 'Aisle cannot be empty').optional(),
    fixture: z.string().min(1, 'Fixture cannot be empty').optional(),
    location_code: z.string().min(1, 'Location code cannot be empty').optional(),
    active: z.boolean().optional(),
    extra_info: z.string().nullable().optional(),
    warehouse_id: uuidSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type CreateStorageLocationInput = z.infer<typeof createStorageLocationSchema>;
export type UpdateStorageLocationInput = z.infer<typeof updateStorageLocationSchema>;