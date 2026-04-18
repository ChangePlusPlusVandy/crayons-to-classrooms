import { z } from 'zod';
import { InventoryMovementSchema } from '../types/InventoryMovement';
import { authFetch } from './authFetch';

export const ActivityDisplaySchema = InventoryMovementSchema.extend({
  product_name: z.string().nullable(),
  from_location_name: z.string().nullable(),
  to_location_name: z.string().nullable(),
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),
  is_grouped_operation: z.boolean().optional().default(false),
  grouped_batch_count: z.number().int().optional().default(1),
});

export const PaginatedActivitiesSchema = z.object({
  data: z.array(ActivityDisplaySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ActivityDisplay = z.infer<typeof ActivityDisplaySchema>;
export type PaginatedActivities = z.infer<typeof PaginatedActivitiesSchema>;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getActivities(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedActivities> {
  const response = await authFetch(
    `${API_BASE_URL}/inventory-movement/detailed?page=${page}&limit=${limit}`
  );
  if (!response.ok) throw new Error('Failed to fetch activities');
  return PaginatedActivitiesSchema.parse(await response.json());
}
