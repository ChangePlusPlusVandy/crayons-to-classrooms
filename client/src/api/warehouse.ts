import { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../types/Warehouse';
import { authFetch } from './authFetch';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export async function getWarehouses(): Promise<Warehouse[]> {
  const response = await authFetch(`${API_BASE_URL}/warehouses`);
  if (!response.ok) throw new Error('Failed to fetch warehouses');
  return response.json();
}

// Get all warehouses by ID
export async function getWarehouseById(id: string): Promise<Warehouse> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch warehouse');
  }

  return response.json();
}

// get all warehouses by name
export async function getWarehouseByName(name: string): Promise<Warehouse> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/name/${name}`);

  if (!response.ok) {
    throw new Error('Failed to fetch warehouse by name');
  }

  return response.json();
}

// Add a warehouse
export async function createWarehouse(data: CreateWarehouseRequest): Promise<Warehouse> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create warehouse');
  }

  return response.json();
}

// update a warehouse
export async function updateWarehouse(
  id: string,
  data: UpdateWarehouseRequest
): Promise<Warehouse> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update warehouse');
  }

  return response.json();
}

// delete a warehouse
export async function deleteWarehouse(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/warehouses/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete warehouse');
  }
}
