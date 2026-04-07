import { z } from 'zod';
import { Product } from '../types/Product';
import { Item } from '../types/Item';
import { StorageLocation } from '../types/StorageLocation';
import { Warehouse } from '../types/Warehouse';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';

import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CreateInventoryMovementRequestSchema = InventoryMovementSchema.omit({
  id: true,
  performed_at: true,
}).extend({
  product_id: z.string(),
  performed_by: z.string(),
  from_location_id: z.string().nullable().optional(),
  to_location_id: z.string().nullable().optional(),
});

type CreateInventoryMovementRequest = z.input<typeof CreateInventoryMovementRequestSchema>;

export async function getProducts(): Promise<Product[]> {
  const response = await authFetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const response = await authFetch(`${API_BASE_URL}/warehouses`);
  if (!response.ok) throw new Error('Failed to fetch warehouses');
  return response.json();
}

export async function getStorageLocations(): Promise<StorageLocation[]> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations`);
  if (!response.ok) throw new Error('Failed to fetch storage locations');
  return response.json();
}

export async function getProductById(id: string): Promise<Product> {
  const response = await authFetch(`${API_BASE_URL}/products/${id}`);
  if (!response.ok) throw new Error('Failed to fetch product');
  return response.json();
}

export async function getStorageLocationById(id: string): Promise<StorageLocation> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch storage location');
  return response.json();
}

export async function getWarehouseById(id: string): Promise<Warehouse> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/${id}`);
  if (!response.ok) throw new Error('Failed to fetch warehouse');
  return response.json();
}

export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement`);
  if (!response.ok) throw new Error('Failed to fetch inventory movements');
  const data = await response.json();
  return z.array(InventoryMovementSchema).parse(data);
}

export async function createItem(itemData: {
  name: string;
  item_info?: string;
  product_id?: string;
  quantity: number;
  stock: number;
  current_location_id: string;
  status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
  created_by: string;
  warehouse: string;
  category?: string;
  item_limit?: number;
  value?: number;
  limbo?: boolean;
  notes?: string;
}): Promise<Item> {
  const response = await authFetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) throw new Error('Failed to create item');
  return response.json();
}

export async function createInventoryMovement(
  movement: CreateInventoryMovementRequest
): Promise<InventoryMovement> {
  const payload = CreateInventoryMovementRequestSchema.parse(movement);
  const response = await authFetch(`${API_BASE_URL}/inventory-movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create inventory movement');
  const data = await response.json();
  return InventoryMovementSchema.parse(data);
}

export async function createProduct(payload: {
  name: string;
  value: number;
  category?: string;
  item_limit?: number;
}): Promise<Product> {
  const response = await authFetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
}

export async function createItemWithMovement(payload: {
  item: {
    name: string;
    item_info?: string;
    product_id?: string;
    quantity: number;
    stock: number;
    current_location_id: string;
    status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
    created_by: string;
    warehouse: string;
    category?: string;
    item_limit?: number;
    value?: number;
    limbo?: boolean;
    notes?: string;
    fixture?: string;
  };
  movement: {
    inventory_action: 'ADD';
    from_location_id?: string | null;
    to_location_id: string;
    quantity: number;
    performed_by: string;
    note?: string;
  };
}): Promise<{ items: Item[]; movement: InventoryMovement }> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/with-item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create items with movement');
  return response.json();
}

export async function bulkCreateItemsWithMovement(payload: {
  entries: Array<{
    item: {
      name: string;
      item_info?: string;
      product_id?: string;
      quantity: number;
      stock: number;
      current_location_id: string;
      status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
      created_by: string;
      warehouse: string;
      category?: string;
      item_limit?: number;
      value?: number;
      limbo?: boolean;
      notes?: string;
      fixture?: string;
    };
    movement: {
      inventory_action: 'ADD';
      from_location_id?: string | null;
      to_location_id: string;
      quantity: number;
      performed_by: string;
      note?: string;
    };
  }>;
}): Promise<{ results: Array<{ items: Item[]; movement: InventoryMovement }> }> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/with-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to bulk create items with movements');
  return response.json();
}
