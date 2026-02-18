import { z } from 'zod';

export const InventoryMovementSchema = z.object({
  id: z.string().optional(),
  inventory_action: z.enum(['MOVE', 'ADD', 'CHECKOUT', 'DISCARD', 'ADJUSTMENT']),
  item_id: z.string(),
  product_id: z.string(),
  from_location_id: z.string().nullable(),
  to_location_id: z.string(),
  quantity: z.coerce.number(),
  performed_by: z.string().nullable(),
  note: z.string().nullable().optional(),
  performed_at: z.string(),
});

export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
