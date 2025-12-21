import { Warehouse } from '../types/Warehouse';
import { StorageLocation } from '../types/StorageLocation';
import { Item } from '../types/Item';
import { InventoryMovement } from '../types/InventoryMovement';
import { Product } from '../types/Product';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

export async function getStorageLocationByCode(locationCode: string): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/locationCode/${locationCode}`);
  if (!response.ok) throw new Error('Failed to fetch storage location');
  return response.json();
}

export async function getItemsByLocation(locationId: string): Promise<Item[]> {
  const response = await fetch(`${API_BASE_URL}/items/location/${locationId}`);
  if (!response.ok) throw new Error('Failed to fetch items at location');
  return response.json();
}

export async function createInventoryMovement(
  movement: InventoryMovement
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

export async function updateItemLocation(itemId: string, locationId: string): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ current_location_id: locationId }),
  });
  if (!response.ok) throw new Error('Failed to update item location');
  return response.json();
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}
