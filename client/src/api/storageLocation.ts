// src/api/storageLocations.ts
import { StorageLocation } from '../types/StorageLocation';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// GET /api/storage-locations
export async function getAllStorageLocations(): Promise<StorageLocation[]> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/`);
  if (!response.ok) throw new Error('Failed to authFetch storage locations');
  return response.json();
}

// GET /api/storage-locations/:id
export async function getStorageLocationById(id: string): Promise<StorageLocation> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/${id}`);
  if (!response.ok) throw new Error('Failed to authFetch storage location by ID');
  return response.json();
}

// GET /api/storage-locations/locationCode/:locationCode
export async function getStorageLocationByLocationCode(
  locationCode: string
): Promise<StorageLocation> {
  const response = await authFetch(
    `${API_BASE_URL}/storage-locations/locationCode/${locationCode}`
  );
  if (!response.ok) throw new Error('Failed to authFetch storage location by location code');
  return response.json();
}

// GET /api/storage-locations/slot/:slot
export async function getStorageLocationBySlot(slot: string): Promise<StorageLocation> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/slot/${slot}`);
  if (!response.ok) throw new Error('Failed to authFetch storage location by slot');
  return response.json();
}

// POST /api/storage-locations
export async function createStorageLocation(
  data: Partial<StorageLocation>
): Promise<StorageLocation> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create new storage location');
  return response.json();
}

// PATCH /api/storage-locations/:id
export async function updateStorageLocation(
  id: string,
  data: Partial<StorageLocation>
): Promise<StorageLocation> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update storage location');
  return response.json();
}

// DELETE /api/storage-locations/:id
export async function deleteStorageLocation(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete storage location');
}

export interface LocationCodeBrowseParams {
  page?: number;
  limit?: number;
  search?: string;
  warehouse?: string;
  include_empty?: boolean;
}

export interface LocationCodeBrowseItem {
  id: string;
  location_code: string;
  warehouse_id: string;
  warehouse_name: string;
  distinct_items: number;
  total_units: number;
  is_empty: boolean;
}

export interface LocationCodeBrowseResponse {
  data: LocationCodeBrowseItem[];
  total: number;
  page: number;
  limit: number;
}

export interface LocationCodeContents {
  location_code: string;
  items: { name: string; total_quantity: number }[];
}

// GET /api/storage-locations/browse
export async function browseLocationCodes(
  params: LocationCodeBrowseParams = {}
): Promise<LocationCodeBrowseResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.warehouse) searchParams.set('warehouse', params.warehouse);
  if (params.include_empty !== undefined) {
    searchParams.set('include_empty', params.include_empty ? 'true' : 'false');
  }

  const response = await authFetch(
    `${API_BASE_URL}/storage-locations/browse?${searchParams.toString()}`
  );
  if (!response.ok) throw new Error('Failed to fetch location codes');
  return response.json();
}

// GET /api/storage-locations/:id/contents
export async function getLocationCodeContents(id: string): Promise<LocationCodeContents> {
  const response = await authFetch(`${API_BASE_URL}/storage-locations/${id}/contents`);
  if (!response.ok) throw new Error('Failed to fetch location contents');
  return response.json();
}
