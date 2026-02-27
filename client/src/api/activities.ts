import { InventoryMovement } from '../types/InventoryMovement';

export interface ActivityDisplay extends InventoryMovement {
  product_name: string | null;
  from_location_name: string | null;
  to_location_name: string | null;
  user_name: string | null;
}

export interface PaginatedActivities {
  data: ActivityDisplay[];
  total: number;
  page: number;
  limit: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getActivities(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedActivities> {
  const response = await fetch(
    `${API_BASE_URL}/inventory-movement/detailed?page=${page}&limit=${limit}`
  );
  if (!response.ok) throw new Error('Failed to fetch activities');
  return response.json();
}
