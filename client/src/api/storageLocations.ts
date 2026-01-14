import { StorageLocation } from '../types/InventoryMovement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getStorageLocationById(locationId: string): Promise<StorageLocation> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/storage-location/${locationId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch storage location');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
