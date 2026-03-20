import { InventoryMovement } from '../types/InventoryMovement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function removeItemsWithMovement(payload: {
  item_ids: string[];
  movement: {
    inventory_action: 'DONATED' | 'DISCARD';
    from_location_id: string | null;
    quantity: number;
    performed_by: string;
    note?: string;
  };
}): Promise<{ updatedCount: number; movement: InventoryMovement }> {
  const response = await fetch(`${API_BASE_URL}/inventory-movement/with-remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to remove items');
  return response.json();
}
