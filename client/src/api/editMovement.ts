import { InventoryMovement } from '../types/InventoryMovement';
import { Product } from '../types/Product';
import {
  createItem,
  createInventoryMovement,
} from './addItem';
import { undoInventoryMovement } from './moveItem';

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
    typeof product.item_limit === 'string'
      ? parseInt(product.item_limit, 10)
      : product.item_limit;

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
