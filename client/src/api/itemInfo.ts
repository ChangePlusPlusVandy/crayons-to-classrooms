// client/src/api/itemInfo.ts
import { z } from 'zod';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export interface ItemInfoBrowseParams {
  page?: number;
  limit?: number;
  search?: string;
  warehouse?: string;
  category?: string;
  fixture?: string;
  stock_status?: 'in_stock' | 'out_of_stock';
}

export interface ItemInfoBrowseItem {
  id: string;
  name: string;
  product_id: string | null;
  category: string | null;
  quantity: number | null;
  stock: number;
  value: number | null;
  item_limit: number | null;
  fixture: string | null;
  last_known_location_code: string;
  time_last_updated: string;
  notes: string | null;
  updated_at: string;
  warehouses: { id: string; name: string }[];
  in_stock: boolean;
}

export interface ItemInfoBrowseResponse {
  data: ItemInfoBrowseItem[];
  total: number;
  page: number;
  limit: number;
}

export async function browseItemsInfo(
  params: ItemInfoBrowseParams = {}
): Promise<ItemInfoBrowseResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.warehouse) searchParams.set('warehouse', params.warehouse);
  if (params.category) searchParams.set('category', params.category);
  if (params.fixture) searchParams.set('fixture', params.fixture);
  if (params.stock_status) searchParams.set('stock_status', params.stock_status);

  const response = await authFetch(`${API_BASE_URL}/item-info/browse?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch items');
  return response.json();
}

export interface ItemInfoWarehouseLocation {
  warehouse_id: string;
  warehouse_name: string;
  locations: {
    location_code: string;
    aisle: string;
    slot: string;
    stock: number;
  }[];
}

export interface ItemInfoDetails {
  id: string;
  name: string;
  product_id: string | null;
  category: string | null;
  quantity: number | null;
  stock: number;
  value: number | null;
  item_limit: number | null;
  fixture: string | null;
  last_known_location_code: string;
  time_last_updated: string;
  notes: string | null;
  updated_at: string;
  warehouse_locations: ItemInfoWarehouseLocation[];
  in_stock: boolean;
}

export async function getItemInfoDetails(id: string): Promise<ItemInfoDetails> {
  const response = await authFetch(`${API_BASE_URL}/item-info/${id}/details`);
  if (!response.ok) throw new Error('Failed to fetch item details');
  return response.json();
}

export interface UpdateItemInfoRequest {
  category?: string;
  item_limit?: number;
  fixture?: string;
  product_id?: string;
  value?: number;
  quantity?: number;
}

export async function updateItemInfo(id: string, data: UpdateItemInfoRequest): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/item-info/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update item info');
}

export async function getItemInfoCategories(): Promise<string[]> {
  const response = await authFetch(`${API_BASE_URL}/item-info/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

/** node-postgres often returns int/bigint/numeric as strings; accept both. */
const pgInt = z.union([z.number(), z.string(), z.null()]).transform((v) => {
  if (v === null) return 0;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : 0;
});

const pgIntNullable = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return Number.isFinite(n) ? n : null;
  });

const pgDecimalNullable = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  });

export const ItemInfoSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .nullable()
    .transform((v) => v ?? ''),
  /** Joined from products when present; for display only. */
  product_name: z.string().nullable().optional(),
  product_id: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  quantity: pgIntNullable,
  value: pgDecimalNullable,
  item_limit: pgIntNullable,
  stock: pgInt,
  fixture: z.string().nullable().optional(),
  last_known_location_code: z.string().nullable().optional(),
  time_last_updated: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  limbo: z.boolean().nullable().optional(),
});

export type ItemInfo = z.infer<typeof ItemInfoSchema>;

export async function getItemInfoAll(): Promise<ItemInfo[]> {
  const response = await authFetch(`${API_BASE_URL}/item-info`);
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) throw new Error('Failed to fetch item info');
  const data = await response.json();
  return z.array(ItemInfoSchema).parse(data);
}

export async function getItemInfoById(id: string): Promise<ItemInfo> {
  const response = await authFetch(`${API_BASE_URL}/item-info/${id}`);
  if (!response.ok) throw new Error('Failed to fetch item info');
  const data = await response.json();
  return ItemInfoSchema.parse(data);
}

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
export async function patchItemInfo(id: string, body: { limbo: boolean }): Promise<ItemInfo> {
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
