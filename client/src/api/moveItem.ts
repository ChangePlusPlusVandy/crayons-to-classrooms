import { Warehouse } from '../types/Warehouse';
import { StorageLocation } from '../types/StorageLocation';
import { Item, ItemGroup } from '../types/Item';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';

import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const BULK_OPERATION_BATCH_SIZE = Math.max(
  1,
  Number(process.env.REACT_APP_BULK_OPERATION_BATCH_SIZE || 2000)
);

export type BulkOperationProgress = {
  action: 'MOVE' | 'REMOVE';
  batch: number;
  totalBatches: number;
  processedItems: number;
  totalItems: number;
};

const BULK_NOTE_MARKER_REGEX = /\s*\[BULK_OP:[^\]]+\]\s*$/;

function sanitizeUserNote(note?: string): string | undefined {
  if (!note) return undefined;
  return note.replace(BULK_NOTE_MARKER_REGEX, '').trim() || undefined;
}

function withBulkNoteMarker(
  note: string | undefined,
  operationId: string,
  batch: number,
  totalBatches: number
): string {
  const marker = `[BULK_OP:${operationId};BATCH:${batch}/${totalBatches}]`;
  const cleanNote = sanitizeUserNote(note);
  return cleanNote ? `${cleanNote} ${marker}` : marker;
}

function chunkIds(ids: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }
  return chunks;
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

export async function getStorageLocationByCode(locationCode: string): Promise<StorageLocation> {
  const response = await authFetch(
    `${API_BASE_URL}/storage-locations/locationCode/${locationCode}`
  );
  if (!response.ok) throw new Error('Failed to fetch storage location');
  return response.json();
}

export async function getItemsByLocation(locationId: string): Promise<Item[]> {
  const response = await authFetch(`${API_BASE_URL}/items/location/${locationId}`);
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch items at location');
  }
  return response.json();
}

export async function getItemsByWarehouse(warehouseId: string): Promise<Item[]> {
  const response = await authFetch(`${API_BASE_URL}/items/warehouse/${warehouseId}`);
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch items for warehouse');
  }
  return response.json();
}

export async function createInventoryMovement(
  movement: Omit<InventoryMovement, 'id' | 'performed_at'>
): Promise<InventoryMovement> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement`, {
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

export async function updateItemQuantity(itemId: string, newQuantity: number): Promise<Item> {
  const response = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
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
  const response = await authFetch(`${API_BASE_URL}/items/${itemId}`, {
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
    const name = item.name ?? 'Unknown';
    const key = `${item.warehouse}|${item.current_location_id}|${name}`;

    if (groupMap.has(key)) {
      const group = groupMap.get(key)!;
      group.quantity += 1;
    } else {
      groupMap.set(key, {
        current_location_id: item.current_location_id,
        warehouse: item.warehouse,
        name,
        product_id: item.product_id,
        quantity: 1,
        value: item.value ?? 0,
      });
    }
  });

  return Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function undoInventoryMovement(movementId: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${movementId}/undo`, {
    method: 'POST',
  });
  if (!response.ok) {
    let errorMessage = 'Failed to undo movement';
    try {
      const data = await response.json();
      if (data && data.error) {
        errorMessage = data.error;
      }
    } catch {
      // If JSON parsing fails, use default message
    }
    throw new Error(errorMessage);
  }
}

export async function moveItemsWithMovement(payload: {
  item_ids: string[];
  movement: {
    inventory_action: 'MOVE';
    from_location_id: string | null;
    to_location_id: string;
    quantity: number;
    performed_by: string;
    note?: string;
  };
  onProgress?: (progress: BulkOperationProgress) => void;
}): Promise<{ updatedCount: number; movement: InventoryMovement }> {
  const idBatches = chunkIds(payload.item_ids, BULK_OPERATION_BATCH_SIZE);
  let totalUpdated = 0;
  let lastMovement: InventoryMovement | null = null;
  const operationId = crypto.randomUUID();

  for (let i = 0; i < idBatches.length; i += 1) {
    const batchIds = idBatches[i];
    const batchPayload = {
      item_ids: batchIds,
      movement: {
        ...payload.movement,
        quantity: batchIds.length,
        note: withBulkNoteMarker(payload.movement.note, operationId, i + 1, idBatches.length),
      },
    };

    const response = await authFetch(`${API_BASE_URL}/inventory-movement/with-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchPayload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to move items in batch ${i + 1}/${idBatches.length} (processed ${totalUpdated}/${payload.item_ids.length}).`
      );
    }

    const result = (await response.json()) as { updatedCount: number; movement: InventoryMovement };
    totalUpdated += result.updatedCount;
    lastMovement = result.movement;
    payload.onProgress?.({
      action: 'MOVE',
      batch: i + 1,
      totalBatches: idBatches.length,
      processedItems: totalUpdated,
      totalItems: payload.item_ids.length,
    });
  }

  if (!lastMovement) {
    throw new Error('Failed to move items: no movement was created.');
  }

  return {
    updatedCount: totalUpdated,
    movement: lastMovement,
  };
}

export async function removeItemsWithMovement(payload: {
  item_ids: string[];
  movement: {
    inventory_action: 'DONATED' | 'DISCARD';
    from_location_id: string;
    quantity: number;
    performed_by: string;
    note?: string;
  };
  onProgress?: (progress: BulkOperationProgress) => void;
}): Promise<{ updatedCount: number; movement: InventoryMovement }> {
  const idBatches = chunkIds(payload.item_ids, BULK_OPERATION_BATCH_SIZE);
  let totalUpdated = 0;
  let lastMovement: InventoryMovement | null = null;
  const operationId = crypto.randomUUID();

  for (let i = 0; i < idBatches.length; i += 1) {
    const batchIds = idBatches[i];
    const batchPayload = {
      item_ids: batchIds,
      movement: {
        ...payload.movement,
        quantity: batchIds.length,
        note: withBulkNoteMarker(payload.movement.note, operationId, i + 1, idBatches.length),
      },
    };

    const response = await authFetch(`${API_BASE_URL}/inventory-movement/with-removal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to remove items in batch ${i + 1}/${idBatches.length} (processed ${totalUpdated}/${payload.item_ids.length}).`
      );
    }

    const result = (await response.json()) as { updatedCount: number; movement: InventoryMovement };
    totalUpdated += result.updatedCount;
    lastMovement = result.movement;
    payload.onProgress?.({
      action: 'REMOVE',
      batch: i + 1,
      totalBatches: idBatches.length,
      processedItems: totalUpdated,
      totalItems: payload.item_ids.length,
    });
  }

  if (!lastMovement) {
    throw new Error('Failed to remove items: no movement was created.');
  }

  return {
    updatedCount: totalUpdated,
    movement: lastMovement,
  };
}
