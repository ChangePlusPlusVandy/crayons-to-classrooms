import { Item } from '../types/Item';
import { InventoryMovement, InventoryMovementSchema } from '../types/InventoryMovement';
import { Product } from '../types/Product';
import { createItem, createInventoryMovement } from './addItem';
import { undoInventoryMovement } from './moveItem';

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
 * Edit an existing ADD movement by undoing it, then creating new items
 * and recording a new ADD inventory movement.
 */
export async function editAddMovement(
  originalMovement: InventoryMovement,
  params: EditAddMovementParams
): Promise<InventoryMovement> {
  const { product, destinationLocationId, warehouseId, quantity, performedBy, note } = params;

  // Step 1: Undo the original movement
  await undoInventoryMovement(originalMovement.id!);

  // Step 2: Create new items (one per quantity, same as AddItem page)
  const itemLimit =
    typeof product.item_limit === 'string' ? parseInt(product.item_limit, 10) : product.item_limit;

  const itemPromises = [];
  for (let i = 0; i < quantity; i++) {
    itemPromises.push(
      createItem({
        name: product.name,
        product_id: product.id,
        quantity: 1,
        stock: 1,
        current_location_id: destinationLocationId,
        status: 'active',
        created_by: performedBy,
        warehouse: warehouseId,
        category: product.category || undefined,
        item_limit: itemLimit || undefined,
        value: product.value,
        limbo: false,
        notes: note,
      })
    );
  }
  const newItems = await Promise.all(itemPromises);

  // Step 3: Create new inventory movement record
  const newMovement = await createInventoryMovement({
    inventory_action: 'ADD',
    item_id: newItems[0].id,
    product_id: product.id,
    from_location_id: null,
    to_location_id: destinationLocationId,
    quantity,
    performed_by: performedBy,
    note,
  });

  return newMovement;
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
  const response = await fetch(`${API_BASE_URL}/inventory-movement/${movementId}/edit-add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to edit movement');
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
  const response = await fetch(`${API_BASE_URL}/inventory-movement/${movementId}/edit-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to edit movement');
  const data = await response.json();
  return { movement: InventoryMovementSchema.parse(data.movement) };
}
