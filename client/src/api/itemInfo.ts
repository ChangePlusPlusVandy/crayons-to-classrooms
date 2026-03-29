// client/src/api/itemInfo.ts
import { z } from 'zod';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const ItemInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  product_id: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  value: z.number().nullable().optional(),
  item_limit: z.number().nullable().optional(),
  stock: z.number(),
  fixture: z.string().nullable().optional(),
  last_known_location_code: z.string().nullable().optional(),
  time_last_updated: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  limbo: z.boolean().nullable().optional(),
});

export type ItemInfo = z.infer<typeof ItemInfoSchema>;

export async function getLimboItems(): Promise<ItemInfo[]> {
  const response = await authFetch(`${API_BASE_URL}/item-info/limbo`);
  if (response.status === 404) {
    // No limbo items found; return empty list instead of treating as an error.
    return [];
  }
  if (!response.ok) throw new Error('Failed to fetch limbo items');
  const data = await response.json();
  return z.array(ItemInfoSchema).parse(data);
}

export async function getOutOfStockItems(): Promise<ItemInfo[]> {
  const response = await authFetch(`${API_BASE_URL}/item-info/out-of-stock`);
  if (response.status === 404) {
    // No out of stock items found; return empty list instead of treating as an error.
    return [];
  }
  if (!response.ok) throw new Error('Failed to fetch out of stock items');
  const data = await response.json();
  return z.array(ItemInfoSchema).parse(data);
}

/** PATCH /item-info/:id — body must include at least one allowed field (server-validated). */
export async function patchItemInfo(
  id: string,
  body: { limbo: boolean }
): Promise<ItemInfo> {
  const response = await authFetch(`${API_BASE_URL}/item-info/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = 'Failed to update item';
    try {
      const err = (await response.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = await response.json();
  return ItemInfoSchema.parse(data);
}

export async function deleteItemInfo(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/item-info/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    let message = 'Failed to delete item';
    try {
      const err = (await response.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}
export const InventoryStatsSchema = z.object({
  total_skus: z.number(),
  stocked_skus: z.number(),
  total_slots: z.number(),
  occupied_slots: z.number(),
});

export type InventoryStats = z.infer<typeof InventoryStatsSchema>;

export async function getInventoryStats(): Promise<InventoryStats> {
  const response = await authFetch(`${API_BASE_URL}/item-info/stats`);
  if (!response.ok) throw new Error('Failed to fetch inventory stats');
  const data = await response.json();
  return InventoryStatsSchema.parse(data);
}
