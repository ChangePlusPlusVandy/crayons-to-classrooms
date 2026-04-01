import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export interface ItemInfoBrowseParams {
  page?: number;
  limit?: number;
  search?: string;
  warehouse?: string;
  category?: string;
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
  if (params.stock_status) searchParams.set('stock_status', params.stock_status);

  const response = await authFetch(
    `${API_BASE_URL}/item-info/browse?${searchParams.toString()}`
  );
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
    fixture: string | null;
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
}

export async function updateItemInfo(
  id: string,
  data: UpdateItemInfoRequest
): Promise<void> {
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

