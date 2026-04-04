import { z } from 'zod';

export const InventoryMovementSchema = z.object({
  id: z.string(),
  inventory_action: z.enum(['MOVE', 'ADD', 'CHECKOUT', 'DISCARD', 'ADJUSTMENT', 'DONATED']),
  item_id: z.string(),
  product_id: z.string().nullable(),
  from_location_id: z.string().nullable(),
  to_location_id: z.string().nullable(),
  quantity: z.coerce.number().int().positive(),
  performed_by: z.string().nullable(),
  note: z.string().nullable().optional(),
  performed_at: z.string(),
});

export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
