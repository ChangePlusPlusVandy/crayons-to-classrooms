import { Item } from '../types/Item';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';
import { Product } from '../types/Product';

import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export interface EditAddMovementParams {
  product: Product;
  destinationLocationId: string;
  warehouseId: string;
  quantity: number;
  performedBy: string;
  note?: string;
}

/**
 * Edit an existing ADD movement using the transactional backend endpoint.
 * Undoes the original movement and creates new items + movement atomically.
 */
export async function editAddMovementTransaction(
  movementId: string,
  payload: {
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
      inventory_action: 'ADD' | 'MOVE' | 'CHECKOUT' | 'DISCARD' | 'ADJUSTMENT';
      from_location_id?: string | null;
      to_location_id: string;
      quantity: number;
      performed_by: string;
      note?: string;
    };
  }
): Promise<{ items: Item[]; movement: InventoryMovement }> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${movementId}/edit-add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to edit movement');
  }
  const data = await response.json();
  return { ...data, movement: InventoryMovementSchema.parse(data.movement) };
}

/**
 * Edit an existing MOVE movement using the transactional backend endpoint.
 * Undoes the original movement and relocates items atomically.
 */
export async function editMoveMovementTransaction(
  movementId: string,
  payload: {
    from_location_id: string;
    to_location_id: string;
    product_id: string;
    quantity: number;
    performed_by: string;
    note?: string;
  }
): Promise<{ movement: InventoryMovement }> {
  const response = await authFetch(`${API_BASE_URL}/inventory-movement/${movementId}/edit-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to edit movement');
  }
  const data = await response.json();
  return { movement: InventoryMovementSchema.parse(data.movement) };
}
