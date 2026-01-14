import { InventoryMovement } from '../types/InventoryMovement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getMovementsByItemId(itemId: string): Promise<InventoryMovement[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/inventory-movement/item/${itemId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch inventory movements');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function getLastMovementForItem(itemId: string): Promise<InventoryMovement | null> {
  const movements = await getMovementsByItemId(itemId);
  if (movements.length === 0) return null;

  // Sort by performed_at descending to get the most recent
  movements.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  return movements[0];
}

export async function createInventoryMovement(data: {
  inventory_action: string;
  item_id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  performed_by: string;
  note?: string;
}): Promise<InventoryMovement> {
  const response = await fetch(`${API_BASE_URL}/inventory-movement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create inventory movement');
  }

  return response.json();
}
