// src/api/storageLocations.ts
import { StorageLocation } from '../types/StorageLocation';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// GET /api/storage-locations
export async function getAllStorageLocations(): Promise<StorageLocation[]> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/`);
  if (!response.ok) throw new Error('Failed to fetch storage locations');
  return response.json();
}

// GET /api/storage-locations/:id
export async function getStorageLocationById(id: string): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch storage location by ID');
  return response.json();
}

// GET /api/storage-locations/locationCode/:locationCode
export async function getStorageLocationByLocationCode(
  locationCode: string
): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/locationCode/${locationCode}`);
  if (!response.ok) throw new Error('Failed to fetch storage location by location code');
  return response.json();
}

// GET /api/storage-locations/slot/:slot
export async function getStorageLocationBySlot(slot: string): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/slot/${slot}`);
  if (!response.ok) throw new Error('Failed to fetch storage location by slot');
  return response.json();
}

// POST /api/storage-locations
export async function createStorageLocation(
  data: Partial<StorageLocation>
): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create storage location');
  return response.json();
}

// PATCH /api/storage-locations/:id
export async function updateStorageLocation(
  id: string,
  data: Partial<StorageLocation>
): Promise<StorageLocation> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update storage location');
  return response.json();
}

// DELETE /api/storage-locations/:id
export async function deleteStorageLocation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/storage-locations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete storage location');
}
