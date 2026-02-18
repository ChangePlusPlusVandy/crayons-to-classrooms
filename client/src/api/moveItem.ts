import { Warehouse } from '../types/Warehouse';
import { StorageLocation } from '../types/StorageLocation';
import { Item, ItemGroup } from '../types/Item';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';

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
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch items at location');
  }
  return response.json();
}

export async function createInventoryMovement(
  movement: Omit<InventoryMovement, 'id' | 'performed_at'>
): Promise<InventoryMovement> {
  const response = await fetch(`${API_BASE_URL}/inventory-movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(movement),
  });
  if (!response.ok) throw new Error('Failed to create inventory movement');
  const data = await response.json();
  return InventoryMovementSchema.parse(data);
}

export async function createItem(itemData: {
  name: string;
  product_id: string;
  quantity: number;
  current_location_id?: string;
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

export async function updateItemQuantity(itemId: string, newQuantity: number): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quantity: newQuantity }),
  });
  if (!response.ok) throw new Error('Failed to update item quantity');
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

export function groupItemsByLocation(items: Item[]): ItemGroup[] {
  const groupMap = new Map<string, ItemGroup>();

  items.forEach((item) => {
    const key = `${item.warehouse}|${item.current_location_id}|${item.name}`;

    if (groupMap.has(key)) {
      const group = groupMap.get(key)!;
      group.quantity += 1;
    } else {
      groupMap.set(key, {
        current_location_id: item.current_location_id,
        warehouse: item.warehouse,
        name: item.name ?? 'Unknown',
        quantity: 1,
      });
    }
  });

  return Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function undoInventoryMovement(movementId: string): Promise<void> {                             
  const response = await fetch(`${API_BASE_URL}/inventory-movement/${movementId}/undo`, {                    
    method: 'POST',                                                                                          
  });                                                                                                        
  if (!response.ok) throw new Error('Failed to undo movement');                                              
} 