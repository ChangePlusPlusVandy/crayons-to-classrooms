import { Product } from '../types/Product';
import { Item } from '../types/Item';
import { StorageLocation } from '../types/StorageLocation';
import { Warehouse } from '../types/Warehouse';
import { InventoryMovement, CreateInventoryMovementRequest } from '../types/InventoryMovement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const response = await fetch(`${API_BASE_URL}/warehouses`);
  if (!response.ok) throw new Error('Failed to fetch warehouses');
  return response.json();
}

export async function getStorageLocations(): Promise<StorageLocation[]> {
  const response = await fetch(`${API_BASE_URL}/storage-locations`);
  if (!response.ok) throw new Error('Failed to fetch storage locations');
  return response.json();
}

export async function createItem(itemData: {
  name: string;
  product_id: string;
  quantity: number;
  stock: number;
  current_location_id: string;
  status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
  created_by: string;
  warehouse: string;
  category?: string;
  item_limit?: number;
  value: number;
  limbo?: boolean;
  notes?: string;
}): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items`, {
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
  const response = await fetch(`${API_BASE_URL}/inventory-movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(movement),
  });
  if (!response.ok) throw new Error('Failed to create inventory movement');
  return response.json();
}

export async function createItemWithMovement(payload: {
  item: {
    name: string;
    product_id: string;
    quantity: number;
    stock: number;
    current_location_id: string;
    status: 'active' | 'inactive' | 'discontinued' | 'checked_out';
    created_by: string;
    warehouse: string;
    category?: string;
    item_limit?: number;
    value: number;
    limbo?: boolean;
    notes?: string;
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
  const response = await fetch(`${API_BASE_URL}/inventory-movement/with-item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create items with movement');
  return response.json();
}
